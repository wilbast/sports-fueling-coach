import { NextRequest, NextResponse } from "next/server";
import { buildCoachContext, type CoachContextSource } from "@/domain/coach/context-builder";
import type { CoachMode, CoachOutcome, CoachPlanChange, CoachPlanResponse, CoachSuggestion } from "@/domain/coach/types";
import type { MealLog } from "@/domain/nutrition/logs";
import type { DayBlockType, DayContext, DayPlan } from "@/domain/planning/types";
import type { IsoDate } from "@/domain/shared";
import type {
  RunningFocus,
  RunningWorkoutType,
  SportType,
  WorkoutIntensity
} from "@/domain/training/types";
import { getAiErrorDebug, resolveAiJsonClient } from "@/lib/ai/server";
import { loadRecentExternalActivitiesForCoach } from "@/lib/integrations/activity-sync";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CoachRequestBody = {
  message?: string;
  state?: CoachContextSource;
  threadId?: string;
};

type CoachChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: CoachMode;
  createdAt: string;
};

const sportValues: SportType[] = ["running", "padel", "swimming", "squash", "hiit", "strength", "cycling"];
const runningTypeValues: RunningWorkoutType[] = ["easy_run", "tempo_run", "fartlek", "intervals"];
const runningFocusValues: RunningFocus[] = ["base", "recovery", "threshold", "vo2max"];
const intensityValues: WorkoutIntensity[] = ["easy", "moderate", "hard", "optional"];

type CoachIntent = {
  type: "info" | "recommendation" | "advice";
  mode: CoachMode;
  domain: CoachOutcome["domain"];
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as CoachRequestBody | null;
  const message = body?.message?.trim();
  const state = body?.state;
  const threadId = normalizeThreadId(body?.threadId);

  if (!message || !state) {
    return NextResponse.json({ error: "Nachricht oder App-Zustand fehlt." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const conversationHistory = user ? await loadCoachChatHistory(user.id, threadId, 16) : [];
  const coachState = await resolveCoachSourceState(state, user?.id);
  const aiClient = resolveAiJsonClient();

  if (aiClient.status === "disabled") {
    const fallback = {
      ...createFallbackCoachResponse(message, coachState),
      ai: {
        status: "fallback" as const,
        message: "OPENAI_API_KEY fehlt oder AI ist nicht konfiguriert. Der regelbasierte Fallback antwortet.",
        debug: {
          httpStatus: null,
          errorCode: "ai_disabled",
          message: "AI_PROVIDER, AI_API_KEY oder OPENAI_API_KEY ist nicht gesetzt.",
          model: process.env.AI_MODEL?.trim() || null,
          hasApiKey: Boolean(process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())
        }
      }
    };
    await persistCoachExchange(user?.id, threadId, message, fallback);
    return NextResponse.json(fallback);
  }

  if (aiClient.status === "invalid") {
    const fallback = createFallbackCoachResponse(message, coachState);
    const response = {
      ...fallback,
      assistantMessage: `${fallback.assistantMessage} ${aiClient.message} Ich nutze deshalb den regelbasierten Fallback.`,
      ai: {
        status: "fallback" as const,
        message: aiClient.message,
        debug: aiClient.debug
      }
    };
    await persistCoachExchange(user?.id, threadId, message, response);

    return NextResponse.json(response);
  }

  try {
    const outputText = await aiClient.generateJson({
      systemPrompt: createSystemPrompt(),
      userPayload: {
        ...buildCoachContext(message, coachState),
        conversationHistory: conversationHistory.map((item) => ({
          role: item.role,
          content: item.content,
          mode: item.mode,
          createdAt: item.createdAt
        }))
      },
      schemaName: "sports_fueling_coach_plan_response",
      schema: createCoachResponseSchema()
    });
    const parsed = outputText ? JSON.parse(outputText) as Partial<CoachPlanResponse> : null;
    const response = {
      ...normalizeCoachResponse(parsed, coachState.weekPlan.days, message),
      ai: {
        status: "configured" as const
      }
    };
    await persistCoachExchange(user?.id, threadId, message, response);

    return NextResponse.json(response);
  } catch (error) {
    const debug = getAiErrorDebug(error, aiClient);
    const fallback = {
      ...createFallbackCoachResponse(message, coachState),
      ai: {
        status: "fallback" as const,
        message: "OpenAI konnte gerade nicht antworten. Der regelbasierte Fallback wurde genutzt.",
        debug
      }
    };
    await persistCoachExchange(user?.id, threadId, message, fallback);
    return NextResponse.json(fallback);
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const threadId = normalizeThreadId(request.nextUrl.searchParams.get("threadId"));
  const messages = await loadCoachChatHistory(user.id, threadId, 80);

  return NextResponse.json({ messages });
}

async function resolveCoachSourceState(requestState: CoachContextSource, userId?: string): Promise<CoachContextSource> {
  if (!isSupabaseConfigured()) return requestState;

  try {
    if (!userId) return requestState;
    const supabase = createSupabaseServerClient();

    const { data } = await supabase
      .from("app_states")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    const storedState = data?.state;

    const externalActivities = await loadRecentExternalActivitiesForCoach(userId);
    const nutritionLogsToday = await loadNutritionLogsForCoach(userId, requestState.selectedDate);

    if (isCoachContextSource(storedState)) {
      return {
        ...normalizeCoachSourceState(storedState, requestState),
        externalActivities,
        nutritionLogsToday
      };
    }

    return {
      ...requestState,
      externalActivities,
      nutritionLogsToday
    };
  } catch {
    return requestState;
  }

  return requestState;
}

async function getCurrentUser(): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id } : null;
  } catch {
    return null;
  }
}

async function loadCoachChatHistory(userId: string, threadId: string, limit: number): Promise<CoachChatHistoryMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("coach_chat_messages")
    .select("id, role, content, mode, created_at")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[coach] chat history not available", { message: error.message });
    return [];
  }

  return (data ?? [])
    .reverse()
    .map((row) => ({
      id: String(row.id),
      role: row.role === "assistant" ? "assistant" : "user",
      content: String(row.content ?? ""),
      mode: row.mode === "coach" || row.mode === "planning" || row.mode === "change" ? row.mode : undefined,
      createdAt: String(row.created_at)
    }));
}

async function persistCoachExchange(
  userId: string | undefined,
  threadId: string,
  userMessage: string,
  response: CoachPlanResponse
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("coach_chat_messages")
    .insert([
      {
        user_id: userId,
        thread_id: threadId,
        role: "user",
        content: userMessage,
        metadata: {}
      },
      {
        user_id: userId,
        thread_id: threadId,
        role: "assistant",
        content: response.assistantMessage,
        mode: response.mode,
        metadata: {
          outcomes: response.outcomes,
          suggestions: response.suggestions,
          changes: response.changes,
          questions: response.questions,
          confidence: response.confidence,
          ai: response.ai
        }
      }
    ]);

  if (error) {
    console.warn("[coach] chat exchange could not be persisted", { message: error.message });
  }
}

function normalizeThreadId(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : "default";
}

async function loadNutritionLogsForCoach(userId: string, date: string): Promise<MealLog[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meal_logs")
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, created_at")
    .eq("user_id", userId)
    .eq("logged_date", date)
    .order("time_label", { ascending: true, nullsFirst: false });

  if (error) {
    console.warn("[coach] nutrition logs not available", { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    date: String(row.logged_date),
    time: typeof row.time_label === "string" ? row.time_label : null,
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : null,
    source: row.source === "standard" || row.source === "recipe" || row.source === "free_text" || row.source === "ai_estimate" || row.source === "manual" ? row.source : "free_text",
    confidence: row.confidence === "low" || row.confidence === "medium" || row.confidence === "high" || row.confidence === "manual" ? row.confidence : "medium",
    values: {
      calories: Number(row.calories ?? 0),
      proteinGrams: Number(row.protein_grams ?? 0),
      carbohydrateGrams: Number(row.carbohydrate_grams ?? 0),
      fatGrams: row.fat_grams == null ? undefined : Number(row.fat_grams)
    },
    rationale: typeof row.estimate_rationale === "string" ? row.estimate_rationale : null,
    manuallyConfirmed: Boolean(row.manually_confirmed),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined
  }));
}

function isCoachContextSource(value: unknown): value is CoachContextSource {
  if (!isRecord(value)) return false;

  return typeof value.selectedDate === "string" &&
    isRecord(value.profile) &&
    isRecord(value.goals) &&
    isRecord(value.weekPlan) &&
    Array.isArray((value.weekPlan as { days?: unknown }).days);
}

function normalizeCoachSourceState(storedState: CoachContextSource, requestState: CoachContextSource): CoachContextSource {
  return {
    selectedDate: storedState.selectedDate ?? requestState.selectedDate,
    profile: storedState.profile ?? requestState.profile,
    goals: storedState.goals ?? requestState.goals,
    weekPlan: storedState.weekPlan ?? requestState.weekPlan,
    weekPlans: storedState.weekPlans?.length ? storedState.weekPlans : requestState.weekPlans,
    mealTemplates: storedState.mealTemplates ?? requestState.mealTemplates,
    standards: storedState.standards ?? requestState.standards
  };
}

function createSystemPrompt(): string {
  return [
    "Du bist ein deutschsprachiger Sports & Fueling Coach für genau einen ambitionierten Freizeitsportler.",
    "Du bist zuerst persönlicher Coach, nicht Formularausfüller. Antworte ruhig, ehrlich, kompetent, pragmatisch und alltagstauglich.",
    "Du erhältst einen serverseitig gebauten, strukturierten Coach-Kontext. Nutze nur diesen Kontext und fordere fehlende Details gezielt an.",
    "Es gibt drei Modi: coach, planning, change.",
    "Coach Mode ist der Standard und soll 80-90 Prozent der Gespräche abdecken: Beratung, Einschätzung, Alternativen, Motivation, Erklärung, Diskussion.",
    "Im Zweifel IMMER mode=coach. Im Coach Mode dürfen changes und suggestion.changes leer sein. Keine Datenänderungen vorbereiten.",
    "Planning Mode nur, wenn der Nutzer ausdrücklich einen konkreten Plan oder konkrete Einheiten erstellt haben will.",
    "Im Planning Mode darfst du Vorschläge mit suggestion.changes als Draft liefern. Diese werden NICHT gespeichert, sondern nur zur Bestätigung angezeigt.",
    "Change Mode nur bei ausdrücklicher Bestätigung wie übernehmen, speichern, passt oder ja. Ohne vorhandenen bestätigten Draft sollst du kurz nachfragen.",
    "Niemals so antworten, als hättest du Daten geändert. Formuliere vor Bestätigung als Vorschlag.",
    "Empfehlungen sind immer erlaubt. Blockiere hilfreiche Antworten nicht, nur weil keine eindeutige Planänderung vorliegt.",
    "Trenne Beratung, Vorschlag und Änderung klar. Nutze outcomes für recommendation, clarification_question, plan_change oder no_change_note.",
    "Bei Beratungsfragen: analysiere, vergleiche Varianten, nenne Vor- und Nachteile und gib eine klare Empfehlung mit Begründung.",
    "Bei Info/Wunsch/Stimmung, z. B. Alkohol, Restaurant, Müdigkeit: keine automatische Planänderung. Gib kurze Einordnung und optionales Angebot.",
    "Bei Empfehlungsfragen: gib konkrete Mengen, Timing, Mahlzeiten, Snacks, Flüssigkeit oder Regenerationstipps ohne changes zu erzwingen.",
    "Ausnahme für Fueling/Nutrition: Wenn der Nutzer eine konkrete Mahlzeit, ein Rezept oder ein Fueling beschreibt, darfst du einen speicherbaren Entwurf in suggestion.changes mit type=add_meal liefern. Das ist nur ein Vorschlag und wird erst bei Bestätigung gespeichert.",
    "Bei add_meal schätze alltagstauglich einen Durchschnittswert. Setze caloriesMin=caloriesMax und proteinMin=proteinMax. Schätze zusätzlich carbohydrateGrams und fatGrams. Stelle die Werte nicht als exakt dar.",
    "Wenn der Nutzer sagt 'Merke dir das als Standard', 'Füge ... als Standard hinzu' oder 'Standardfrühstück', liefere einen add_meal-Entwurf mit saveAsStandard=true. Der Client zeigt danach eine Standard-Speichern-Aktion.",
    "Bei unklarem Kontext: stelle maximal 1-2 gezielte Rückfragen.",
    "Erlaubte Sportarten: running, padel, swimming, squash, hiit, strength, cycling.",
    "Bei running nutze runningType: easy_run, tempo_run, fartlek oder intervals.",
    "Bei running nutze runningFocus: base, recovery, threshold oder vo2max.",
    "Erlaubte Tageskontexte: homeoffice, office, travel, free, vacation.",
    "Berücksichtige Familie, Job, Pendelzeit und Betreuungsaufwand, wenn du Zeitfenster, Intensität oder Fueling empfiehlst.",
    "Nutze nur Datumswerte aus der übergebenen Woche. Wenn der Nutzer einen Wochentag nennt, ordne ihn dieser Woche zu.",
    "Für Trainings- und Wochenplanung suggestion.changes nur in mode=planning nutzen. Für Fueling-/Rezept-Entwürfe sind suggestion.changes auch in mode=coach erlaubt, solange klar ist, dass noch nichts gespeichert wurde.",
    "Keine medizinischen Diagnosen. Keine erfundenen externen Daten. Antworte ausschließlich als JSON im geforderten Schema."
  ].join("\n");
}

function createCoachResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["mode", "assistantMessage", "outcomes", "questions", "changes", "suggestions", "confidence"],
    properties: {
      mode: {
        type: "string",
        enum: ["coach", "planning", "change"]
      },
      assistantMessage: { type: "string" },
      outcomes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          required: ["type", "domain", "summary", "planChange"],
          properties: {
            type: {
              type: "string",
              enum: ["recommendation", "clarification_question", "plan_change", "no_change_note"]
            },
            domain: {
              type: "string",
              enum: ["training", "fueling", "nutrition", "planning", "recovery", "general"]
            },
            day: { type: "string" },
            summary: { type: "string" },
            planChange: {
              anyOf: [
                { type: "null" },
                { type: "object", additionalProperties: true }
              ]
            }
          }
        }
      },
      questions: {
        type: "array",
        items: { type: "string" }
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"]
      },
      changes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            type: {
              type: "string",
              enum: ["set_day_context", "add_extra_info", "add_workout", "move_workout", "add_meal"]
            },
            date: { type: "string" }
          }
        }
      },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          required: ["id", "title", "kind", "summary", "rationale", "tips", "changes"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            kind: {
              type: "string",
              enum: ["training", "fueling", "recipe", "recovery", "planning"]
            },
            summary: { type: "string" },
            rationale: { type: "string" },
            tips: {
              type: "array",
              items: { type: "string" }
            },
            changes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true
              }
            }
          }
        }
      }
    }
  };
}

function normalizeCoachResponse(
  parsed: Partial<CoachPlanResponse> | null,
  days: DayPlan[],
  originalMessage: string
): CoachPlanResponse {
  if (!parsed) {
    return {
      mode: "coach",
      assistantMessage: "Ich konnte die Antwort nicht sicher lesen. Sag mir bitte Tag, Training und groben Zweck noch einmal.",
      outcomes: [{
        type: "clarification_question",
        domain: "general",
        summary: "Mir fehlen Tag, Bereich oder Ziel für eine sichere Empfehlung.",
        planChange: null
      }],
      questions: ["Für welchen Tag soll ich das einplanen?"],
      changes: [],
      suggestions: [],
      confidence: "low"
    };
  }

  const intent = inferCoachIntent(originalMessage.toLowerCase());
  const mode = normalizeResponseMode(parsed.mode, intent.mode);
  const allowDraftChanges = mode === "planning" || intent.domain === "fueling" || intent.domain === "nutrition";
  const allowDirectChanges = false;
  const normalizedChanges = Array.isArray(parsed.changes)
    ? parsed.changes.map((change) => normalizeCoachPlanChange(change, days)).filter((change): change is CoachPlanChange => Boolean(change))
    : [];
  const changes = allowDirectChanges ? normalizedChanges : [];
  const normalizedSuggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((suggestion) => normalizeCoachSuggestion(suggestion, days)).filter((suggestion): suggestion is CoachSuggestion => Boolean(suggestion))
    : [];
  const suggestions = allowDraftChanges
    ? normalizedSuggestions
    : normalizedSuggestions.map((suggestion) => ({ ...suggestion, changes: [] }));
  const outcomes = Array.isArray(parsed.outcomes)
    ? parsed.outcomes.map((outcome) => normalizeCoachOutcome(outcome, days, allowDirectChanges)).filter((outcome): outcome is CoachOutcome => Boolean(outcome))
    : createOutcomesFromResponse(changes, suggestions, parsed.questions);

  return {
    mode,
    assistantMessage: typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
      ? enforceModeBoundary(parsed.assistantMessage.trim(), mode)
      : createAssistantSummary(changes, suggestions, originalMessage),
    outcomes,
    questions: Array.isArray(parsed.questions)
      ? parsed.questions.filter((question): question is string => typeof question === "string" && question.trim().length > 0).slice(0, 3)
      : [],
    changes,
    suggestions,
    confidence: parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : changes.length > 0 || suggestions.length > 0 ? "medium" : "low"
  };
}

function normalizeResponseMode(value: unknown, fallback: CoachMode): CoachMode {
  if (fallback === "coach") return "coach";
  if (fallback === "planning") return "planning";
  if (fallback === "change") return "change";

  return fallback;
}

function enforceModeBoundary(message: string, mode: CoachMode): string {
  if (mode === "coach" && !mentionsNoChange(message)) {
    return `${message} Ich habe nichts am Plan geändert.`;
  }

  if (mode === "planning" && !mentionsProposal(message)) {
    return `${message} Wenn dir der Vorschlag gefällt, kannst du ihn anschließend übernehmen.`;
  }

  return message;
}

function normalizeCoachOutcome(outcome: unknown, days: DayPlan[], allowPlanChanges: boolean): CoachOutcome | null {
  if (!isRecord(outcome)) return null;
  if (!isOutcomeType(outcome.type) || !isOutcomeDomain(outcome.domain)) return null;
  if (typeof outcome.summary !== "string" || !outcome.summary.trim()) return null;

  const planChange = allowPlanChanges && isRecord(outcome.planChange)
    ? normalizeCoachPlanChange(outcome.planChange, days)
    : null;

  return {
    type: allowPlanChanges ? outcome.type : outcome.type === "plan_change" ? "recommendation" : outcome.type,
    domain: outcome.domain,
    day: typeof outcome.day === "string" ? outcome.day : undefined,
    summary: outcome.summary.trim(),
    planChange
  };
}

function createOutcomesFromResponse(
  changes: CoachPlanChange[],
  suggestions: CoachSuggestion[],
  questions: unknown
): CoachOutcome[] {
  if (changes.length > 0) {
    return changes.map((change) => ({
      type: "plan_change",
      domain: domainFromChange(change),
      day: "date" in change ? change.date : change.fromDate,
      summary: summaryFromChange(change),
      planChange: change
    }));
  }

  if (suggestions.length > 0) {
    return suggestions.map((suggestion) => ({
      type: "recommendation",
      domain: domainFromSuggestionKind(suggestion.kind),
      summary: suggestion.summary,
      planChange: null
    }));
  }

  if (Array.isArray(questions) && questions.length > 0) {
    return [{
      type: "clarification_question",
      domain: "general",
      summary: String(questions[0]),
      planChange: null
    }];
  }

  return [{
    type: "no_change_note",
    domain: "general",
    summary: "Ich habe nichts am Plan geändert.",
    planChange: null
  }];
}

function normalizeCoachPlanChange(change: unknown, days: DayPlan[]): CoachPlanChange | null {
  if (!isRecord(change)) return null;
  if (typeof change.date !== "string" || !days.some((day) => day.date === change.date)) return null;

  if (change.type === "set_day_context" && isPlanningContext(change.context)) {
    return {
      type: "set_day_context",
      date: change.date as IsoDate,
      context: change.context
    };
  }

  if (change.type === "add_extra_info" && typeof change.label === "string" && change.label.trim()) {
    return {
      type: "add_extra_info",
      date: change.date as IsoDate,
      label: change.label.trim(),
      impact: typeof change.impact === "string" ? change.impact : undefined,
      blockType: isDayBlockType(change.blockType) ? change.blockType : undefined,
      context: isDayContext(change.context) ? change.context : undefined
    };
  }

  if (change.type === "add_workout" && isRecord(change.workout)) {
    const workout = change.workout;
    if (!isSportType(workout.sport) || typeof workout.title !== "string" || !workout.title.trim()) return null;

    return {
      type: "add_workout",
      date: change.date as IsoDate,
      saveAsStandard: typeof change.saveAsStandard === "boolean" ? change.saveAsStandard : undefined,
      workout: {
        sport: workout.sport,
        title: workout.title.trim(),
        startTime: typeof workout.startTime === "string" ? workout.startTime : undefined,
        durationMinutes: toOptionalNumber(workout.durationMinutes),
        distanceKm: toOptionalNumber(workout.distanceKm),
        status: workout.status === "optional" ? "optional" : "planned",
        intensity: isIntensity(workout.intensity) ? workout.intensity : "moderate",
        runningType: workout.sport === "running" && isRunningType(workout.runningType) ? workout.runningType : undefined,
        runningFocus: workout.sport === "running" && isRunningFocus(workout.runningFocus) ? workout.runningFocus : undefined,
        description: typeof workout.description === "string" ? workout.description : undefined
      }
    };
  }

  if (change.type === "move_workout") {
    const fromDate = typeof change.fromDate === "string" && days.some((day) => day.date === change.fromDate)
      ? change.fromDate as IsoDate
      : typeof change.date === "string" && days.some((day) => day.date === change.date)
        ? change.date as IsoDate
        : null;
    const toDate = typeof change.toDate === "string" && days.some((day) => day.date === change.toDate)
      ? change.toDate as IsoDate
      : null;

    if (!fromDate || !toDate || fromDate === toDate) return null;

    return {
      type: "move_workout",
      fromDate,
      toDate,
      workoutId: typeof change.workoutId === "string" ? change.workoutId : undefined,
      sport: isSportType(change.sport) ? change.sport : undefined
    };
  }

  if (change.type === "add_meal" && isRecord(change.meal)) {
    const meal = change.meal;
    if (typeof meal.time !== "string" || !isMealRole(meal.role) || typeof meal.name !== "string" || !meal.name.trim()) {
      return null;
    }

    return {
      type: "add_meal",
      date: change.date as IsoDate,
      meal: {
        time: meal.time,
        role: meal.role,
        name: meal.name.trim(),
        description: typeof meal.description === "string" && meal.description.trim()
          ? meal.description.trim()
          : "Grobe Coach-Mahlzeit ohne Grammtracking.",
        caloriesMin: toOptionalNumber(meal.caloriesMin),
        caloriesMax: toOptionalNumber(meal.caloriesMax),
        proteinMin: toOptionalNumber(meal.proteinMin),
        proteinMax: toOptionalNumber(meal.proteinMax),
        carbohydrateGrams: toOptionalNumber(meal.carbohydrateGrams),
        fatGrams: toOptionalNumber(meal.fatGrams),
        tags: Array.isArray(meal.tags) ? meal.tags.filter((tag): tag is string => typeof tag === "string") : ["coach"],
        saveAsStandard: typeof meal.saveAsStandard === "boolean" ? meal.saveAsStandard : undefined
      }
    };
  }

  return null;
}

function normalizeCoachSuggestion(suggestion: unknown, days: DayPlan[]): CoachSuggestion | null {
  if (!isRecord(suggestion)) return null;
  if (typeof suggestion.title !== "string" || !suggestion.title.trim()) return null;
  if (!isSuggestionKind(suggestion.kind)) return null;

  const changes = Array.isArray(suggestion.changes)
    ? suggestion.changes.map((change) => normalizeCoachPlanChange(change, days)).filter((change): change is CoachPlanChange => Boolean(change))
    : [];

  return {
    id: typeof suggestion.id === "string" && suggestion.id.trim()
      ? suggestion.id.trim()
      : `suggestion-${suggestion.kind}-${changes.length}`,
    title: suggestion.title.trim(),
    kind: suggestion.kind,
    summary: typeof suggestion.summary === "string" && suggestion.summary.trim()
      ? suggestion.summary.trim()
      : suggestion.title.trim(),
    rationale: typeof suggestion.rationale === "string" && suggestion.rationale.trim()
      ? suggestion.rationale.trim()
      : "Passt zum aktuellen Trainings- und Fueling-Kontext.",
    tips: Array.isArray(suggestion.tips)
      ? suggestion.tips.filter((tip): tip is string => typeof tip === "string" && tip.trim().length > 0).slice(0, 4)
      : [],
    changes
  };
}

function createFallbackCoachResponse(
  message: string,
  state: NonNullable<CoachRequestBody["state"]>
): CoachPlanResponse {
  const lower = message.toLowerCase();
  const intent = inferCoachIntent(lower);
  const date = resolveDate(lower, state.selectedDate, state.weekPlan.days);
  const day = state.weekPlan.days.find((item) => item.date === date);
  const draftChanges: CoachPlanChange[] = [];
  const shouldCreateDraft = intent.mode === "planning";
  const context = shouldCreateDraft ? inferPlanningContext(lower) : null;
  const extraInfo = shouldCreateDraft ? inferExtraInfo(message) : null;
  const workout = shouldCreateDraft ? inferWorkout(message) : null;
  const questions: string[] = [];

  const moveChange = shouldCreateDraft ? inferMoveWorkoutChange(lower, state, date) : null;

  if (moveChange) {
    draftChanges.push(moveChange);
  } else if (shouldCreateDraft) {
    if (context) {
      draftChanges.push({ type: "set_day_context", date, context });
    }

    if (extraInfo) {
      draftChanges.push({
        type: "add_extra_info",
        date,
        label: extraInfo.label,
        impact: extraInfo.impact,
        blockType: extraInfo.blockType,
        context: extraInfo.context
      });
    }

    if (workout) {
      draftChanges.push({
        type: "add_workout",
        date,
        workout
      });

      if (workout.sport === "running" && !workout.distanceKm && !workout.durationMinutes) {
        questions.push("Wie lang soll der Lauf ungefähr werden?");
      }

      if (workout.sport === "running" && !workout.runningFocus) {
        questions.push("Ist der Fokus eher Basis, Regeneration, Schwelle oder VO2Max?");
      }
    }
  }

  if (intent.mode === "change") {
    questions.push("Was genau soll ich übernehmen? Nutze den Button am Vorschlag oder sag mir kurz, welchen Vorschlag du meinst.");
  } else if (shouldCreateDraft && draftChanges.length === 0) {
    questions.push("Soll ich daraus einen konkreten Wochenvorschlag machen oder erst Varianten vergleichen?");
  }

  const includeFuelingDraft = (intent.domain === "fueling" || intent.domain === "nutrition") && mentionsConcreteFuelingDraft(lower);
  const suggestions = createFallbackSuggestions(
    message,
    state,
    date,
    shouldCreateDraft ? workout : inferWorkout(message),
    (shouldCreateDraft && draftChanges.length > 0) || includeFuelingDraft
  );
  const outcomes = createFallbackOutcomes(intent, message, date, day, suggestions, [], questions);

  return {
    mode: intent.mode,
    assistantMessage: createFallbackAssistantMessage(intent, message, day, suggestions, draftChanges, questions),
    outcomes,
    questions,
    changes: [],
    suggestions,
    confidence: draftChanges.length > 0 || suggestions.length > 0 || outcomes.length > 0 ? "medium" : "low"
  };
}

function inferCoachIntent(lower: string): CoachIntent {
  const domain = inferIntentDomain(lower);
  const mode = inferCoachMode(lower);

  if (lower.includes("empfehl") ||
    lower.includes("gib mir") ||
    lower.includes("tipps") ||
    lower.includes("was soll") ||
    lower.includes("was mache") ||
    lower.includes("wie soll") ||
    lower.includes("fueling")) {
    return { type: "recommendation", mode, domain };
  }

  if (lower.includes("soll ich") ||
    lower.includes("macht es sinn") ||
    lower.includes("unsicher") ||
    lower.includes("?")) {
    return { type: "advice", mode, domain };
  }

  return { type: "info", mode, domain };
}

function inferCoachMode(lower: string): CoachMode {
  const confirmationPattern = /^(ja|jep|yes|ok|okay|passt|genau|klingt gut|übernehmen|uebernehmen|speichern|eintragen|mach das|so machen|nimm variante [abc])[\s.!]*$/;
  const asksForAdvice = lower.includes("was empfiehlst du") ||
    lower.includes("was würdest du") ||
    lower.includes("was wuerdest du") ||
    lower.includes("soll ich") ||
    lower.includes("macht es sinn") ||
    lower.includes("deine einschätzung") ||
    lower.includes("deine einschaetzung") ||
    lower.includes("alternativen") ||
    lower.includes("variante") && lower.includes("?");
  const explicitPlanning = lower.includes("erstelle mir") ||
    lower.includes("erstell mir") ||
    lower.includes("plane meine woche") ||
    lower.includes("plan meine woche") ||
    lower.includes("mach daraus") ||
    lower.includes("trainingsplan erstellen") ||
    lower.includes("wochenplan erstellen") ||
    lower.includes("konkrete einheiten") ||
    lower.includes("konkreten plan") ||
    lower.includes("verschieb") ||
    lower.includes("verlege") ||
    lower.includes("füge") ||
    lower.includes("fuege") ||
    lower.includes("in den plan");

  if (confirmationPattern.test(lower) || lower.includes("übernimm den vorschlag") || lower.includes("uebernimm den vorschlag")) {
    return "change";
  }

  if (explicitPlanning && !asksForAdvice) {
    return "planning";
  }

  return "coach";
}

function inferIntentDomain(lower: string): CoachOutcome["domain"] {
  if (lower.includes("fuel") || lower.includes("banane") || lower.includes("snack") || lower.includes("trinken")) return "fueling";
  if (lower.includes("essen") ||
    lower.includes("gegessen") ||
    lower.includes("mahlzeit") ||
    lower.includes("abend") ||
    lower.includes("skyr") ||
    lower.includes("quark") ||
    lower.includes("joghurt") ||
    lower.includes("bowl") ||
    lower.includes("rezept")) return "nutrition";
  if (lower.includes("lauf") || lower.includes("training") || lower.includes("freeletics") || lower.includes("hiit")) return "training";
  if (lower.includes("müde") || lower.includes("muede") || lower.includes("erholung") || lower.includes("schlaf")) return "recovery";
  if (lower.includes("büro") || lower.includes("office") || lower.includes("urlaub") || lower.includes("frei") || lower.includes("reise")) return "planning";

  return "general";
}

function createFallbackOutcomes(
  intent: CoachIntent,
  message: string,
  date: IsoDate,
  day: DayPlan | undefined,
  suggestions: CoachSuggestion[],
  changes: CoachPlanChange[],
  questions: string[]
): CoachOutcome[] {
  if (changes.length > 0) {
    return changes.map((change) => ({
      type: "plan_change",
      domain: domainFromChange(change),
      day: "date" in change ? change.date : change.fromDate,
      summary: summaryFromChange(change),
      planChange: change
    }));
  }

  if (questions.length > 0 && (intent.mode === "planning" || intent.mode === "change")) {
    return [{
      type: "clarification_question",
      domain: intent.domain,
      day: date,
      summary: questions[0],
      planChange: null
    }];
  }

  if (suggestions.length > 0 || intent.type === "recommendation" || intent.type === "advice") {
    return [{
      type: "recommendation",
      domain: intent.domain === "general" ? "fueling" : intent.domain,
      day: date,
      summary: createOutcomeSummary(message, day),
      planChange: null
    }];
  }

  return [{
    type: "no_change_note",
    domain: intent.domain,
    day: date,
    summary: "Ich habe nichts am Plan geändert und ordne die Info nur für dich ein.",
    planChange: null
  }];
}

function createFallbackAssistantMessage(
  intent: CoachIntent,
  message: string,
  day: DayPlan | undefined,
  suggestions: CoachSuggestion[],
  changes: CoachPlanChange[],
  questions: string[]
): string {
  if (changes.length > 0) {
    return `Ich habe daraus einen Vorschlag gebaut: ${changes.map(summaryFromChange).join(" ")} Ich habe noch nichts gespeichert. Wenn er passt, kannst du ihn übernehmen.`;
  }

  if (questions.length > 0 && (intent.mode === "planning" || intent.mode === "change")) {
    return `Ich ändere noch nichts. ${questions.slice(0, 2).join(" ")}`;
  }

  const lower = message.toLowerCase();

  if (mentionsTrainingWeekDiscussion(lower) && intent.mode === "coach") {
    return [
      "Ich würde das zuerst als Belastungswoche betrachten, nicht als reine Terminfrage.",
      "Variante A: Dienstag Intervalle, Freitag Freeletics, Samstag langer GA1-Lauf. Vorteil: Sonntag bleibt frei für Erholung und Familie; Nachteil: Freitag/Samstag ist ein enger Belastungsblock.",
      "Variante B: Dienstag Intervalle, Samstag langer Lauf, Sonntag Freeletics sehr moderat. Vorteil: mehr Abstand vor dem langen Lauf; Nachteil: Sonntag ist dann nicht wirklich frei.",
      "Meine Empfehlung wäre Variante A, aber Freeletics am Freitag bewusst nicht maximal hart. So bleiben die Intervalle hochwertig, der lange Lauf bekommt gutes Fueling, und Sonntag kann echte Regeneration sein. Ich habe nichts am Plan geändert. Wenn dir Variante A gefällt, kann ich daraus einen konkreten Wochenvorschlag machen."
    ].join(" ");
  }

  if (mentionsAlcohol(lower)) {
    return "Okay. Empfehlung: Iss heute etwas leichter, aber proteinreich, und trink pro Bier etwa ein Glas Wasser dazu. Wenn Training geplant ist, vorher nicht nüchtern bleiben. Ich habe nichts am Plan geändert.";
  }

  if (lower.includes("banane")) {
    return "Ja, meistens sinnvoll: 1 Banane 20-45 Minuten vor Freeletics passt gut, besonders wenn die letzte Mahlzeit länger her ist. Dazu 300-500 ml Wasser. Ich ändere nichts am Plan.";
  }

  if (lower.includes("viel gegessen") || lower.includes("schon viel gegessen")) {
    return "Für heute Abend: kein Crash-Ausgleich. Mach es leicht und proteinreich: z. B. Omelett, Skyr oder Fisch/Tofu mit Gemüse. Carbs klein halten, Wasser trinken, danach normal weitermachen.";
  }

  if (intent.type === "recommendation" || intent.type === "advice") {
    return suggestions[0]?.summary
      ? `Empfehlung: ${suggestions[0].summary} Ich habe nichts am Plan geändert.`
      : "Empfehlung: Halte es heute einfach, proteinreich und passend zur Belastung. Ich habe nichts am Plan geändert.";
  }

  const workoutText = day?.workouts.length
    ? ` Heute steht ${day.workouts.map((workout) => workout.title).join(" + ")} im Plan.`
    : " Heute ist kein Training im Plan.";

  return `Okay, ich merke mir die Info als Kontext.${workoutText} Wenn du möchtest, gebe ich dir daraus konkrete Empfehlungen oder passe den Plan an.`;
}

function createOutcomeSummary(message: string, day: DayPlan | undefined): string {
  const lower = message.toLowerCase();

  if (mentionsAlcohol(lower)) return "Empfehlungen für Essen, Trinken und Alkohol-Ausgleich heute.";
  if (lower.includes("banane")) return "Snack-Timing vor Freeletics oder intensiver Einheit.";
  if (lower.includes("viel gegessen")) return "Leichter Abend nach bereits hoher Tageszufuhr.";
  if (day?.workouts.length) return `Empfehlung passend zu ${day.workouts.map((workout) => workout.title).join(" + ")}.`;

  return "Alltagstaugliche Empfehlung ohne Planänderung.";
}

function createFallbackSuggestions(
  message: string,
  state: NonNullable<CoachRequestBody["state"]>,
  date: IsoDate,
  workout: ReturnType<typeof inferWorkout>,
  includePlanChanges = false
): CoachSuggestion[] {
  const lower = message.toLowerCase();
  const suggestions: CoachSuggestion[] = [];
  const day = state.weekPlan.days.find((item) => item.date === date);
  const hasRun = workout?.sport === "running" || day?.workouts.some((item) => item.sport === "running");
  const asksFueling = lower.includes("fuel") || lower.includes("essen") || lower.includes("rezept") || lower.includes("snack") || lower.includes("mahlzeit") || lower.includes("banane") || lower.includes("bier") || lower.includes("gegessen");
  const asksTraining = lower.includes("training") || lower.includes("lauf") || lower.includes("plan") || Boolean(workout);

  if (includePlanChanges && mentionsConcreteFuelingDraft(lower)) {
    suggestions.push(createFuelingLogSuggestion(message, date));
  }

  if (mentionsAlcohol(lower)) {
    suggestions.push({
      id: "fueling-alcohol-balance",
      title: "Bier heute sinnvoll ausgleichen",
      kind: "fueling",
      summary: "Bleib tagsüber leichter, aber nicht leer: Protein sichern, Fett nicht eskalieren, Wasser aktiv dazunehmen.",
      rationale: "Alkohol verschlechtert Flüssigkeitshaushalt und Regeneration. Du musst nicht kompensieren, aber den Rahmen ruhig halten.",
      tips: [
        "Pro Bier etwa 300-500 ml Wasser einplanen.",
        "Abends Protein + Gemüse zuerst, sehr fettige Extras kleiner halten.",
        day?.workouts.length ? "Nach Training erst essen und trinken, dann Alkohol." : "Ohne Training reicht ein leichter, proteinreicher Abend."
      ],
      changes: []
    });
  }

  if (lower.includes("banane")) {
    suggestions.push({
      id: "fueling-banana-before-hiit",
      title: "Banane vor Freeletics",
      kind: "fueling",
      summary: "Eine Banane 20-45 Minuten vorher ist sinnvoll, wenn die letzte Mahlzeit länger her ist oder die Einheit intensiv wird.",
      rationale: "Schnelle Kohlenhydrate helfen bei HIIT, ohne den Magen schwer zu machen.",
      tips: [
        "Bei Hunger: 1 Banane, optional etwas Salz/Wasser.",
        "Wenn du gerade gegessen hast: halbe Banane oder weglassen.",
        "Danach Protein in der nächsten Mahlzeit sichern."
      ],
      changes: []
    });
  }

  if (lower.includes("viel gegessen") || lower.includes("schon viel gegessen")) {
    suggestions.push({
      id: "nutrition-light-evening",
      title: "Leichter Abend ohne Crash-Ausgleich",
      kind: "fueling",
      summary: "Heute Abend leicht und proteinreich bleiben: Gemüse + Protein, wenig Fett, Carbs nur klein nach Hunger oder Training.",
      rationale: "Ein harter Ausgleich am Abend führt oft zu Hunger oder schlechter Regeneration. Ruhig stabilisieren ist besser.",
      tips: [
        "Option: Skyr/Quark mit Beeren oder Omelett mit Gemüse.",
        "Wenn Training war: kleine Carb-Portion dazu, z. B. Kartoffeln oder Brot.",
        "Morgen normal weitermachen, nicht bestrafen."
      ],
      changes: []
    });
  }

  if (asksTraining) {
    const trainingChange = workout
      ? [{
        type: "add_workout" as const,
        date,
        workout
      }]
      : [];

    suggestions.push({
      id: "training-context-suggestion",
      title: hasRun ? "Training sinnvoll einordnen" : "Training mit klarem Zweck planen",
      kind: "training",
      summary: hasRun
        ? "Der Lauf passt gut, wenn er bewusst als Qualität oder Basis geführt wird."
        : "Lege zuerst Zweck und Belastung fest, bevor du Fueling ableitest.",
      rationale: "Der Coach kann bessere Fueling- und Regenerationstipps geben, wenn Sportart, Intensität und Zweck klar sind.",
      tips: [
        "Bei lockeren Läufen wirklich locker bleiben.",
        "Bei Intervallen oder Tempo kein aggressives Defizit planen.",
        "Padel, Squash und HIIT als zusätzliche Belastung ernst nehmen."
      ],
      changes: includePlanChanges ? trainingChange : []
    });
  }

  if (asksFueling || hasRun) {
    suggestions.push(createRecipeSuggestion(date, Boolean(hasRun), includePlanChanges));
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "coach-next-step",
      title: "Nächsten sinnvollen Schritt wählen",
      kind: "planning",
      summary: "Ich würde zuerst klären, ob heute Training, Fueling oder Erholung der Engpass ist.",
      rationale: "Ohne konkreten Engpass wäre jede Empfehlung zu breit.",
      tips: [
        "Frage nach einem Rezept, wenn Essen gerade die Hürde ist.",
        "Frage nach einer Laufeinheit, wenn der Trainingsreiz unklar ist.",
        "Frage nach Regeneration, wenn Müdigkeit oder Stress hoch sind."
      ],
      changes: []
    });
  }

  return suggestions;
}

function createFuelingLogSuggestion(message: string, date: IsoDate): CoachSuggestion {
  const lower = message.toLowerCase();
  const calories = inferMealCalories(lower);
  const protein = inferMealProtein(lower, calories);
  const carbohydrateGrams = inferMealCarbs(lower, calories);
  const fatGrams = Math.round(Math.max(3, (calories - protein * 4 - carbohydrateGrams * 4) / 9));
  const mealName = createFallbackMealName(message);
  const role = inferMealRoleFromText(lower);
  const saveAsStandard = lower.includes("standard") || lower.includes("merke") || lower.includes("merk dir");

  return {
    id: `fueling-log-${date}`,
    title: `${mealName} hinzufügen`,
    kind: "fueling",
    summary: `Als groben Tages-Eintrag speichern: ca. ${calories} kcal, ${protein} g Protein, ${carbohydrateGrams} g Kohlenhydrate, ${fatGrams} g Fett.`,
    rationale: "Das ist eine alltagstaugliche Schätzung aus deiner Beschreibung. Du kannst sie später genauer korrigieren.",
    tips: [
      "Zum Tagesstatus hinzufügen, wenn du es gegessen hast.",
      saveAsStandard ? "Als Standard speichern, damit du sie künftig per Klick nutzen kannst." : "Als Standard speichern, wenn du diese Mahlzeit öfter nutzt."
    ],
    changes: [
      {
        type: "add_meal",
        date,
        meal: {
          time: inferMealTimeFromText(lower),
          role,
          name: mealName,
          description: message,
          caloriesMin: calories,
          caloriesMax: calories,
          proteinMin: protein,
          proteinMax: protein,
          carbohydrateGrams,
          fatGrams,
          tags: ["coach", "fueling", role],
          saveAsStandard
        }
      }
    ]
  };
}

function createRecipeSuggestion(date: IsoDate, hasRun: boolean, includePlanChange = false): CoachSuggestion {
  return {
    id: hasRun ? "recipe-run-bowl" : "recipe-protein-bowl",
    title: hasRun ? "Fueling Bowl für den Lauftag" : "Proteinreiche Alltags-Bowl",
    kind: "recipe",
    summary: hasRun
      ? "Reis oder Kartoffeln, Hähnchen/Tofu, Gemüse, etwas Olivenöl und Obst als einfache Carb-Basis."
      : "Skyr oder Bowl mit Proteinquelle, Gemüse, Kartoffeln/Reis und einer einfachen Sauce.",
    rationale: hasRun
      ? "Du bekommst Kohlenhydrate für Trainingsqualität und genug Protein für Sättigung und Regeneration."
      : "Das hält den Tag ruhig, proteinreich und ohne Grammtracking steuerbar.",
    tips: [
      "Portion grob nach Hunger und Trainingstag skalieren.",
      "Proteinquelle zuerst festlegen.",
      hasRun ? "Carbs vor und nach dem Lauf nicht zu knapp halten." : "Carbs moderat halten, aber nicht streichen."
    ],
    changes: includePlanChange ? [
      {
        type: "add_meal",
        date,
        meal: {
          time: "12:30",
          role: "lunch",
          name: hasRun ? "Fueling Bowl" : "Protein-Bowl",
          description: hasRun
            ? "Reis oder Kartoffeln, Hähnchen oder Tofu, Gemüse, Sauce; gute Carb-Basis für den Lauftag."
            : "Proteinquelle, Gemüse, Reis oder Kartoffeln; ruhig, sättigend und alltagstauglich.",
          caloriesMin: hasRun ? 750 : 650,
          caloriesMax: hasRun ? 750 : 650,
          proteinMin: 45,
          proteinMax: 45,
          carbohydrateGrams: hasRun ? 95 : 65,
          fatGrams: 22,
          tags: ["coach", "recipe", hasRun ? "run-fueling" : "protein"],
          saveAsStandard: true
        }
      }
    ] : []
  };
}

function inferMoveWorkoutChange(
  lower: string,
  state: NonNullable<CoachRequestBody["state"]>,
  fallbackDate: IsoDate
): CoachPlanChange | null {
  if (!lower.includes("verschieb") && !lower.includes("verlege")) return null;

  const sport = inferSport(lower) ?? "running";
  const fromDate = resolveMoveSourceDate(lower, state.selectedDate, state.weekPlan.days) ?? fallbackDate;
  const toDate = resolveMoveTargetDate(lower, fromDate, state.weekPlan.days);
  if (!toDate || fromDate === toDate) return null;

  const sourceDay = state.weekPlan.days.find((day) => day.date === fromDate);
  const workout = sourceDay?.workouts.find((item) => item.sport === sport) ?? sourceDay?.workouts[0];
  if (!workout) return null;

  return {
    type: "move_workout",
    fromDate,
    toDate,
    workoutId: workout.id,
    sport: workout.sport
  };
}

function resolveMoveSourceDate(lower: string, selectedDate: string, days: DayPlan[]): IsoDate | null {
  const fromMatch = lower.match(/von\s+(heute|morgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\d{4}-\d{2}-\d{2})/);
  if (fromMatch) return resolveDate(fromMatch[1], selectedDate, days);
  if (lower.includes("heute")) return resolveDate("heute", selectedDate, days);

  return (days.find((day) => day.date === selectedDate)?.date ?? null) as IsoDate | null;
}

function resolveMoveTargetDate(lower: string, fromDate: IsoDate, days: DayPlan[]): IsoDate | null {
  const targetMatch = lower.match(/(?:auf|nach|zu)\s+(morgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\d{4}-\d{2}-\d{2})/);
  if (targetMatch) {
    if (targetMatch[1] === "morgen") {
      const sourceIndex = days.findIndex((day) => day.date === fromDate);
      return (days[sourceIndex + 1]?.date ?? null) as IsoDate | null;
    }

    return resolveDate(targetMatch[1], fromDate, days);
  }

  if (lower.includes("morgen")) {
    const sourceIndex = days.findIndex((day) => day.date === fromDate);
    return (days[sourceIndex + 1]?.date ?? null) as IsoDate | null;
  }

  return null;
}

function inferWorkout(message: string) {
  const lower = message.toLowerCase();
  const sport = inferSport(lower);

  if (!sport) return null;

  const distanceKm = parseDistanceKm(lower);
  const durationMinutes = parseDurationMinutes(lower);
  const startTime = parseStartTime(lower);
  const shouldCreateWorkout = Boolean(distanceKm || durationMinutes || startTime || lower.includes("plane") || lower.includes("eintragen"));

  if (!shouldCreateWorkout) return null;

  const runningType = sport === "running" ? inferRunningType(lower) : undefined;
  const runningFocus = sport === "running" ? inferRunningFocus(lower, runningType) : undefined;
  const intensity = inferIntensity(lower, sport, runningType);
  const title = createWorkoutTitle(sport, distanceKm, durationMinutes, runningType);

  return {
    sport,
    title,
    startTime,
    durationMinutes,
    distanceKm: sport === "running" ? distanceKm : undefined,
    status: lower.includes("optional") ? "optional" as const : "planned" as const,
    intensity,
    runningType,
    runningFocus,
    description: createWorkoutDescription(sport, runningType, runningFocus)
  };
}

function inferSport(lower: string): SportType | null {
  if (lower.includes("padel")) return "padel";
  if (lower.includes("schwimm")) return "swimming";
  if (lower.includes("squash")) return "squash";
  if (lower.includes("hiit") || lower.includes("freeletics")) return "hiit";
  if (lower.includes("kraft")) return "strength";
  if (lower.includes("rad") || lower.includes("bike") || lower.includes("cycling")) return "cycling";
  if (lower.includes("lauf") || lower.includes("laufen") || lower.includes("jog")) return "running";
  if (/\d+(?:[,.]\d+)?\s*(?:km|kilometer)/.test(lower)) return "running";

  return null;
}

function inferRunningType(lower: string): RunningWorkoutType {
  if (lower.includes("intervall")) return "intervals";
  if (lower.includes("tempodauerlauf") || lower.includes("tempo")) return "tempo_run";
  if (lower.includes("fahrtspiel")) return "fartlek";

  return "easy_run";
}

function inferRunningFocus(lower: string, runningType?: RunningWorkoutType): RunningFocus {
  if (lower.includes("vo2")) return "vo2max";
  if (lower.includes("schwelle")) return "threshold";
  if (lower.includes("regeneration") || lower.includes("recovery")) return "recovery";
  if (lower.includes("basis") || lower.includes("ga1") || lower.includes("grundlage")) return "base";
  if (runningType === "intervals") return "vo2max";
  if (runningType === "tempo_run") return "threshold";

  return "base";
}

function inferIntensity(lower: string, sport: SportType, runningType?: RunningWorkoutType): WorkoutIntensity {
  if (lower.includes("optional")) return "optional";
  if (lower.includes("hart") || runningType === "intervals" || sport === "hiit") return "hard";
  if (lower.includes("locker") || lower.includes("regeneration")) return "easy";
  if (runningType === "tempo_run" || runningType === "fartlek") return "hard";

  return "moderate";
}

function createWorkoutTitle(
  sport: SportType,
  distanceKm?: number,
  durationMinutes?: number,
  runningType?: RunningWorkoutType
): string {
  if (sport === "running") {
    const distance = distanceKm ? `${formatNumber(distanceKm)} km ` : "";
    const typeLabels: Record<RunningWorkoutType, string> = {
      easy_run: "locker",
      tempo_run: "Tempodauerlauf",
      fartlek: "Fahrtspiel",
      intervals: "Intervalltraining"
    };

    return `${distance}${typeLabels[runningType ?? "easy_run"]}`.trim();
  }

  const sportLabels: Record<SportType, string> = {
    running: "Lauf",
    padel: "Padel Tennis",
    swimming: "Schwimmen",
    squash: "Squash",
    hiit: "HIIT",
    strength: "Krafttraining",
    cycling: "Radfahren"
  };

  return durationMinutes ? `${durationMinutes} Minuten ${sportLabels[sport]}` : sportLabels[sport];
}

function createWorkoutDescription(sport: SportType, runningType?: RunningWorkoutType, runningFocus?: RunningFocus): string {
  if (sport === "running") {
    if (runningType === "intervals") return "Intervalltraining, Fueling vorher sichern";
    if (runningType === "tempo_run") return "Tempodauerlauf, nicht nüchtern erzwingen";
    if (runningType === "fartlek") return "Fahrtspiel, Belastung bewusst steuern";
    if (runningFocus === "recovery") return "Regenerativer Lauf, wirklich locker bleiben";

    return "Lockerer Lauf im Wochenkontext";
  }

  if (sport === "strength") return "Kraftreiz, Protein in der nächsten Mahlzeit";
  if (sport === "hiit") return "Intensitätsreiz, Erholung danach ernst nehmen";
  if (sport === "padel" || sport === "squash") return "Spielbelastung, Flüssigkeit und Abendessen mitdenken";

  return "Ausdauereinheit im Wochenkontext";
}

function inferPlanningContext(lower: string) {
  if (lower.includes("home-office") || lower.includes("homeoffice") || lower.includes("daheim")) return "homeoffice";
  if (lower.includes("büro") || lower.includes("office")) return "office";
  if (lower.includes("reise") || lower.includes("reisetag") || lower.includes("zug") || lower.includes("flug")) return "travel";

  return null;
}

function inferExtraInfo(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("biergarten")) {
    return {
      label: "Biergarten",
      impact: "Biergarten einplanen: tagsüber Protein und einfache Standards sichern",
      blockType: "restaurant" as const,
      context: "restaurant" as const
    };
  }

  if (lower.includes("restaurant")) {
    return {
      label: "Restaurantbesuch",
      impact: "Restaurant grob steuern: Proteinquelle zuerst, Beilage bewusst wählen",
      blockType: "restaurant" as const,
      context: "restaurant" as const
    };
  }

  if (lower.includes("freund") || lower.includes("treffen")) {
    return {
      label: "Treffen mit Freunden",
      impact: "Training und Hauptmahlzeit vorher realistisch platzieren",
      blockType: "family" as const,
      context: "family" as const
    };
  }

  return null;
}

function resolveDate(lower: string, selectedDate: string, days: DayPlan[]): IsoDate {
  const isoMatch = lower.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoMatch && days.some((day) => day.date === isoMatch)) return isoMatch as IsoDate;

  const weekdays: Array<[string, number]> = [
    ["montag", 1],
    ["dienstag", 2],
    ["mittwoch", 3],
    ["donnerstag", 4],
    ["freitag", 5],
    ["samstag", 6],
    ["sonntag", 0]
  ];
  const weekday = weekdays.find(([label]) => lower.includes(label));

  if (weekday) {
    const day = days.find((item) => new Date(`${item.date}T12:00:00`).getDay() === weekday[1]);
    if (day) return day.date;
  }

  if (lower.includes("morgen")) {
    const selectedIndex = days.findIndex((day) => day.date === selectedDate);
    const nextDay = days[selectedIndex + 1];
    if (nextDay) return nextDay.date;
  }

  return (days.find((day) => day.date === selectedDate)?.date ?? days[0]?.date ?? selectedDate) as IsoDate;
}

function parseDistanceKm(lower: string): number | undefined {
  const match = lower.match(/(\d+(?:[,.]\d+)?)\s*(?:km|kilometer)/);
  if (!match) return undefined;

  return toOptionalNumber(match[1]);
}

function parseDurationMinutes(lower: string): number | undefined {
  const minuteMatch = lower.match(/(\d+)\s*(?:min|minute|minutes|minuten)/);
  if (minuteMatch) return toOptionalNumber(minuteMatch[1]);

  const hourMatch = lower.match(/(\d+(?:[,.]\d+)?)\s*(?:h|std|stunde|stunden)/);
  const hours = hourMatch ? toOptionalNumber(hourMatch[1]) : undefined;

  return hours ? Math.round(hours * 60) : undefined;
}

function parseStartTime(lower: string): string | undefined {
  const clockMatch = lower.match(/(?:um\s*)?(\d{1,2})[:.](\d{2})/);
  if (clockMatch) return `${clockMatch[1].padStart(2, "0")}:${clockMatch[2]}`;

  const hourMatch = lower.match(/um\s*(\d{1,2})\s*uhr/);
  if (hourMatch) return `${hourMatch[1].padStart(2, "0")}:00`;

  const plainHourMatch = lower.match(/\b(\d{1,2})\s*uhr\b/);
  if (plainHourMatch) return `${plainHourMatch[1].padStart(2, "0")}:00`;

  return undefined;
}

function createAssistantSummary(changes: CoachPlanChange[], suggestions: CoachSuggestion[], message: string): string {
  if (changes.length === 0 && suggestions.length === 0) {
    return `Ich habe nichts am Plan geändert. Sag mir kurz, ob du eine Empfehlung möchtest oder den Plan anpassen willst: "${message}".`;
  }

  const workoutCount = changes.filter((change) => change.type === "add_workout").length;
  const contextCount = changes.filter((change) => change.type === "set_day_context").length;
  const infoCount = changes.filter((change) => change.type === "add_extra_info").length;
  const mealCount = changes.filter((change) => change.type === "add_meal").length;
  const parts = [
    workoutCount ? `${workoutCount} Training` : "",
    contextCount ? `${contextCount} Tageskontext` : "",
    infoCount ? `${infoCount} Zusatzinfo` : "",
    mealCount ? `${mealCount} Mahlzeit` : "",
    suggestions.length ? `${suggestions.length} ${suggestions.length === 1 ? "Vorschlag" : "Vorschläge"}` : ""
  ].filter(Boolean);

  return `Meine Empfehlung: ${parts.join(", ")}. Du kannst passende Vorschläge direkt übernehmen.`;
}

function mentionsAlcohol(lower: string): boolean {
  return lower.includes("bier") ||
    lower.includes("wein") ||
    lower.includes("alkohol") ||
    lower.includes("drink") ||
    lower.includes("trinken gehen");
}

function mentionsConcreteFuelingDraft(lower: string): boolean {
  return lower.includes("speicher") ||
    lower.includes("eintragen") ||
    lower.includes("hinzufügen") ||
    lower.includes("hinzufuegen") ||
    lower.includes("standard") ||
    lower.includes("merke") ||
    lower.includes("gegessen") ||
    lower.includes("mahlzeit") ||
    lower.includes("rezept") ||
    lower.includes("bowl") ||
    lower.includes("skyr") ||
    lower.includes("quark") ||
    lower.includes("snack");
}

function createFallbackMealName(message: string): string {
  const cleaned = message
    .replace(/\b(ich habe|habe|gegessen|getrunken|bitte|heute|speichern|eintragen|hinzufügen|hinzufuegen)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Fueling-Eintrag";

  return cleaned.length > 44 ? `${cleaned.slice(0, 41).trim()}...` : cleaned;
}

function inferMealCalories(lower: string): number {
  const kcalMatch = lower.match(/(\d{2,4})\s*(kcal|kalorien)/);
  if (kcalMatch) return clampNumber(Number.parseInt(kcalMatch[1], 10), 50, 2000);

  if (lower.includes("bowl") || lower.includes("reis") || lower.includes("nudel") || lower.includes("kartoffel")) return 650;
  if (lower.includes("skyr") || lower.includes("quark") || lower.includes("joghurt")) return 420;
  if (lower.includes("banane")) return 105;
  if (lower.includes("riegel") || lower.includes("snack")) return 180;

  return 500;
}

function inferMealProtein(lower: string, calories: number): number {
  const proteinMatch = lower.match(/(\d{1,3})\s*(g\s*)?(protein|eiweiß|eiweiss)/);
  if (proteinMatch) return clampNumber(Number.parseInt(proteinMatch[1], 10), 0, 140);

  if (lower.includes("skyr") || lower.includes("quark") || lower.includes("protein")) return 35;
  if (lower.includes("hähnchen") || lower.includes("haehnchen") || lower.includes("tofu") || lower.includes("ei")) return 40;

  return calories >= 500 ? 25 : 6;
}

function inferMealCarbs(lower: string, calories: number): number {
  if (lower.includes("banane") || lower.includes("müsli") || lower.includes("muesli") || lower.includes("reis") || lower.includes("nudel") || lower.includes("kartoffel")) {
    return Math.round(calories * 0.55 / 4);
  }

  return Math.round(calories * 0.35 / 4);
}

function inferMealRoleFromText(lower: string): "breakfast" | "lunch" | "pre_workout" | "post_workout" | "dinner" {
  if (lower.includes("frühstück") || lower.includes("fruehstueck") || lower.includes("morgens")) return "breakfast";
  if (lower.includes("pre") || lower.includes("vor dem") || lower.includes("vor training") || lower.includes("vor lauf")) return "pre_workout";
  if (lower.includes("post") || lower.includes("nach dem") || lower.includes("nach training") || lower.includes("nach lauf")) return "post_workout";
  if (lower.includes("abend") || lower.includes("dinner")) return "dinner";

  return "lunch";
}

function inferMealTimeFromText(lower: string): string {
  const clockMatch = lower.match(/(?:um\s*)?(\d{1,2})[:.](\d{2})/);
  if (clockMatch) return `${clockMatch[1].padStart(2, "0")}:${clockMatch[2]}`;

  if (lower.includes("frühstück") || lower.includes("fruehstueck") || lower.includes("morgens")) return "08:00";
  if (lower.includes("mittag")) return "12:30";
  if (lower.includes("abend")) return "19:00";
  if (lower.includes("snack") || lower.includes("banane")) return "16:30";

  return "12:30";
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function mentionsTrainingWeekDiscussion(lower: string): boolean {
  return (lower.includes("woche") || lower.includes("wochenplanung") || lower.includes("nächste woche") || lower.includes("naechste woche")) &&
    (lower.includes("intervall") || lower.includes("langer lauf") || lower.includes("freeletics") || lower.includes("training")) &&
    (lower.includes("empfiehl") || lower.includes("was würdest") || lower.includes("was wuerdest") || lower.includes("variante") || lower.includes("?"));
}

function mentionsNoChange(message: string): boolean {
  const lower = message.toLowerCase();

  return lower.includes("nichts am plan geändert") ||
    lower.includes("nichts gespeichert") ||
    lower.includes("keine änderung") ||
    lower.includes("keine aenderung") ||
    lower.includes("ich ändere nichts") ||
    lower.includes("ich aendere nichts");
}

function mentionsProposal(message: string): boolean {
  const lower = message.toLowerCase();

  return lower.includes("vorschlag") ||
    lower.includes("übernehmen") ||
    lower.includes("uebernehmen") ||
    lower.includes("nichts gespeichert") ||
    lower.includes("noch nicht gespeichert");
}

function domainFromChange(change: CoachPlanChange): CoachOutcome["domain"] {
  if (change.type === "add_workout" || change.type === "move_workout") return "training";
  if (change.type === "add_meal") return "fueling";
  if (change.type === "set_day_context" || change.type === "add_extra_info") return "planning";

  return "general";
}

function domainFromSuggestionKind(kind: CoachSuggestion["kind"]): CoachOutcome["domain"] {
  if (kind === "recipe") return "nutrition";
  if (kind === "fueling") return "fueling";
  if (kind === "training") return "training";
  if (kind === "recovery") return "recovery";
  if (kind === "planning") return "planning";

  return "general";
}

function summaryFromChange(change: CoachPlanChange): string {
  if (change.type === "move_workout") return `Training von ${change.fromDate} auf ${change.toDate} verschieben.`;
  if (change.type === "add_workout") return `${change.workout.title} am ${change.date} ergänzen.`;
  if (change.type === "add_meal") return `${change.meal.name} am ${change.date} ergänzen.`;
  if (change.type === "set_day_context") return `Tageskontext am ${change.date} setzen.`;

  return `${change.label} am ${change.date} ergänzen.`;
}

function isOutcomeType(value: unknown): value is CoachOutcome["type"] {
  return value === "recommendation" ||
    value === "clarification_question" ||
    value === "plan_change" ||
    value === "no_change_note";
}

function isOutcomeDomain(value: unknown): value is CoachOutcome["domain"] {
  return value === "training" ||
    value === "fueling" ||
    value === "nutrition" ||
    value === "planning" ||
    value === "recovery" ||
    value === "general";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlanningContext(value: unknown): value is "homeoffice" | "office" | "travel" | "free" | "vacation" {
  return value === "homeoffice" ||
    value === "office" ||
    value === "travel" ||
    value === "free" ||
    value === "vacation";
}

function isDayBlockType(value: unknown): value is DayBlockType {
  return value === "work" ||
    value === "training" ||
    value === "nutrition" ||
    value === "restaurant" ||
    value === "family" ||
    value === "free" ||
    value === "recovery" ||
    value === "travel" ||
    value === "planning";
}

function isDayContext(value: unknown): value is DayContext {
  return value === "homeoffice" ||
    value === "office" ||
    value === "restaurant" ||
    value === "travel" ||
    value === "free" ||
    value === "vacation" ||
    value === "family" ||
    value === "race" ||
    value === "recovery";
}

function isSportType(value: unknown): value is SportType {
  return sportValues.includes(value as SportType);
}

function isRunningType(value: unknown): value is RunningWorkoutType {
  return runningTypeValues.includes(value as RunningWorkoutType);
}

function isRunningFocus(value: unknown): value is RunningFocus {
  return runningFocusValues.includes(value as RunningFocus);
}

function isIntensity(value: unknown): value is WorkoutIntensity {
  return intensityValues.includes(value as WorkoutIntensity);
}

function isMealRole(value: unknown): value is "breakfast" | "lunch" | "pre_workout" | "post_workout" | "dinner" {
  return value === "breakfast" ||
    value === "lunch" ||
    value === "pre_workout" ||
    value === "post_workout" ||
    value === "dinner";
}

function isSuggestionKind(value: unknown): value is CoachSuggestion["kind"] {
  return value === "training" ||
    value === "fueling" ||
    value === "recipe" ||
    value === "recovery" ||
    value === "planning";
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}
