import { NextRequest, NextResponse } from "next/server";
import type { CoachPlanChange, CoachPlanResponse } from "@/domain/coach/types";
import type { UserGoals } from "@/domain/goals/types";
import type { DayBlockType, DayContext, DayPlan, WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { IsoDate } from "@/domain/shared";
import type {
  RunningFocus,
  RunningWorkoutType,
  SportType,
  WorkoutIntensity
} from "@/domain/training/types";
import { resolveAiJsonClient } from "@/lib/ai/server";

export const runtime = "nodejs";

type CoachRequestBody = {
  message?: string;
  state?: {
    selectedDate: string;
    profile: UserProfile;
    goals: UserGoals;
    weekPlan: WeekPlan;
  };
};

const sportValues: SportType[] = ["running", "padel", "swimming", "squash", "hiit", "strength", "cycling"];
const runningTypeValues: RunningWorkoutType[] = ["easy_run", "tempo_run", "fartlek", "intervals"];
const runningFocusValues: RunningFocus[] = ["base", "recovery", "threshold", "vo2max"];
const intensityValues: WorkoutIntensity[] = ["easy", "moderate", "hard", "optional"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as CoachRequestBody | null;
  const message = body?.message?.trim();
  const state = body?.state;

  if (!message || !state) {
    return NextResponse.json({ error: "Nachricht oder App-Zustand fehlt." }, { status: 400 });
  }

  const aiClient = resolveAiJsonClient();

  if (aiClient.status === "disabled") {
    return NextResponse.json(createFallbackCoachResponse(message, state));
  }

  if (aiClient.status === "invalid") {
    const fallback = createFallbackCoachResponse(message, state);

    return NextResponse.json({
      ...fallback,
      assistantMessage: `${fallback.assistantMessage} ${aiClient.message} Ich nutze deshalb den regelbasierten Fallback.`
    });
  }

  try {
    const outputText = await aiClient.generateJson({
      systemPrompt: createSystemPrompt(),
      userPayload: createCoachContext(message, state),
      schemaName: "sports_fueling_coach_plan_response",
      schema: createCoachResponseSchema()
    });
    const parsed = outputText ? JSON.parse(outputText) as Partial<CoachPlanResponse> : null;

    return NextResponse.json(normalizeCoachResponse(parsed, state.weekPlan.days, message));
  } catch {
    return NextResponse.json(createFallbackCoachResponse(message, state));
  }
}

function createSystemPrompt(): string {
  return [
    "Du bist ein deutschsprachiger Sports & Fueling Coach für genau einen ambitionierten Freizeitsportler.",
    "Du wandelst Chat-Nachrichten in konkrete Planänderungen um und stellst intelligente Rückfragen.",
    "Erlaubte Sportarten: running, padel, swimming, squash, hiit, strength, cycling.",
    "Bei running nutze runningType: easy_run, tempo_run, fartlek oder intervals.",
    "Bei running nutze runningFocus: base, recovery, threshold oder vo2max.",
    "Nutze nur Datumswerte aus der übergebenen Woche. Wenn der Nutzer einen Wochentag nennt, ordne ihn dieser Woche zu.",
    "Wenn die Information eindeutig ist, gib passende changes zurück. Wenn etwas wesentlich fehlt, gib trotzdem sichere Changes zurück und frage gezielt nach.",
    "Keine medizinischen Diagnosen. Keine erfundenen externen Daten. Antworte ausschließlich als JSON im geforderten Schema."
  ].join("\n");
}

function createCoachContext(message: string, state: NonNullable<CoachRequestBody["state"]>) {
  return {
    userMessage: message,
    selectedDate: state.selectedDate,
    profile: {
      firstName: state.profile.firstName,
      bodyMetrics: state.profile.bodyMetrics,
      primarySports: state.profile.primarySports,
      coachingStyle: state.profile.coachingStyle,
      raceGoal: state.profile.raceGoal
    },
    goals: state.goals,
    week: state.weekPlan.days.map((day) => ({
      date: day.date,
      weekday: formatWeekday(day.date),
      context: day.context,
      workouts: day.workouts.map((workout) => ({
        sport: workout.sport,
        title: workout.title,
        startTime: workout.startTime,
        durationMinutes: workout.durationMinutes,
        distanceKm: workout.distanceKm,
        status: workout.status,
        intensity: workout.intensity,
        runningType: workout.runningType,
        runningFocus: workout.runningFocus
      })),
      mealPlan: day.mealPlan,
      note: day.note
    }))
  };
}

function createCoachResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["assistantMessage", "questions", "changes", "confidence"],
    properties: {
      assistantMessage: { type: "string" },
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
              enum: ["set_day_context", "add_extra_info", "add_workout", "add_meal"]
            },
            date: { type: "string" }
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
      assistantMessage: "Ich konnte die Antwort nicht sicher lesen. Sag mir bitte Tag, Training und groben Zweck noch einmal.",
      questions: ["Für welchen Tag soll ich das einplanen?"],
      changes: [],
      confidence: "low"
    };
  }

  const changes = Array.isArray(parsed.changes)
    ? parsed.changes.map((change) => normalizeCoachPlanChange(change, days)).filter((change): change is CoachPlanChange => Boolean(change))
    : [];

  return {
    assistantMessage: typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
      ? parsed.assistantMessage.trim()
      : createAssistantSummary(changes, originalMessage),
    questions: Array.isArray(parsed.questions)
      ? parsed.questions.filter((question): question is string => typeof question === "string" && question.trim().length > 0).slice(0, 3)
      : [],
    changes,
    confidence: parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : changes.length > 0 ? "medium" : "low"
  };
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

  return null;
}

function createFallbackCoachResponse(
  message: string,
  state: NonNullable<CoachRequestBody["state"]>
): CoachPlanResponse {
  const lower = message.toLowerCase();
  const date = resolveDate(lower, state.selectedDate, state.weekPlan.days);
  const changes: CoachPlanChange[] = [];
  const context = inferPlanningContext(lower);
  const extraInfo = inferExtraInfo(message);
  const workout = inferWorkout(message);
  const questions: string[] = [];

  if (context) {
    changes.push({ type: "set_day_context", date, context });
  }

  if (extraInfo) {
    changes.push({
      type: "add_extra_info",
      date,
      label: extraInfo.label,
      impact: extraInfo.impact,
      blockType: extraInfo.blockType,
      context: extraInfo.context
    });
  }

  if (workout) {
    changes.push({
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

  if (changes.length === 0) {
    questions.push("Welcher Tag ist betroffen und soll ich Training, Alltag oder Fueling ändern?");
  }

  return {
    assistantMessage: createAssistantSummary(changes, message),
    questions,
    changes,
    confidence: changes.length > 0 ? "medium" : "low"
  };
}

function inferWorkout(message: string) {
  const lower = message.toLowerCase();
  const sport = inferSport(lower);

  if (!sport) return null;

  const runningType = sport === "running" ? inferRunningType(lower) : undefined;
  const runningFocus = sport === "running" ? inferRunningFocus(lower, runningType) : undefined;
  const intensity = inferIntensity(lower, sport, runningType);
  const distanceKm = parseDistanceKm(lower);
  const durationMinutes = parseDurationMinutes(lower);
  const startTime = parseStartTime(lower);
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
  if (lower.includes("hiit")) return "hiit";
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

function createAssistantSummary(changes: CoachPlanChange[], message: string): string {
  if (changes.length === 0) {
    return `Ich habe noch nichts direkt geändert. Mir fehlt eine klare Planinformation aus: "${message}".`;
  }

  const workoutCount = changes.filter((change) => change.type === "add_workout").length;
  const contextCount = changes.filter((change) => change.type === "set_day_context").length;
  const infoCount = changes.filter((change) => change.type === "add_extra_info").length;
  const parts = [
    workoutCount ? `${workoutCount} Training` : "",
    contextCount ? `${contextCount} Tageskontext` : "",
    infoCount ? `${infoCount} Zusatzinfo` : ""
  ].filter(Boolean);

  return `Übernommen: ${parts.join(", ")}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlanningContext(value: unknown): value is "homeoffice" | "office" | "travel" {
  return value === "homeoffice" || value === "office" || value === "travel";
}

function isDayBlockType(value: unknown): value is DayBlockType {
  return value === "work" ||
    value === "training" ||
    value === "nutrition" ||
    value === "restaurant" ||
    value === "family" ||
    value === "recovery" ||
    value === "travel" ||
    value === "planning";
}

function isDayContext(value: unknown): value is DayContext {
  return value === "homeoffice" ||
    value === "office" ||
    value === "restaurant" ||
    value === "travel" ||
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

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long" })
    .format(new Date(`${date}T12:00:00`));
}

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}
