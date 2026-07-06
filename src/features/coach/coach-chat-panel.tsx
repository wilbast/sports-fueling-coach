"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, History, Lightbulb, Loader2, MessageCircle, RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import { Panel, Pill } from "@/components/ui";
import type { CoachChatMessage, CoachMealDraft, CoachMode, CoachOutcome, CoachPlanChange, CoachPlanResponse, CoachSuggestion } from "@/domain/coach/types";
import type { MealLogCategory } from "@/domain/nutrition/logs";
import { estimateMealLogTime, inferMealCategory, mealCategoryToRole } from "@/domain/nutrition/meal-timing";
import { describeWorkoutType } from "@/domain/training/catalog";
import { useAppState } from "@/features/app-state/app-state-provider";
import { useNutritionLogs } from "@/features/nutrition/use-nutrition-logs";

type CoachChatPanelProps = {
  title?: string;
  intro?: string;
  compact?: boolean;
  pageContext?: "today" | "fueling" | "training" | "planning" | "insights" | "settings" | "coach";
  threadId?: string;
  initialMessage?: string;
};

type CoachChatSessionSummary = {
  threadId: string;
  selectedDate: string | null;
  pageContext: string | null;
  title: string;
  preview: string;
  messageCount: number;
  startedAt?: string;
  updatedAt?: string;
};

export function CoachChatPanel({
  title = "Coach fragen",
  intro = "Frag nach Training, Fueling, Rezepten, Regeneration oder Tagesstrategie.",
  compact = false,
  pageContext = "coach",
  threadId = "default",
  initialMessage
}: CoachChatPanelProps) {
  const { state, addMealTemplate, applyCoachPlanChanges } = useAppState();
  const { addLog } = useNutritionLogs(state.selectedDate);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState(() => createChatSessionId(threadId, pageContext, state.selectedDate));
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<CoachChatSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [appliedInitialMessage, setAppliedInitialMessage] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ id: string; changes: CoachPlanChange[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const payloadState = useMemo(() => ({
    selectedDate: state.selectedDate,
    profile: state.profile,
    goals: state.goals,
    weekPlan: state.weekPlan,
    weekPlans: state.weekPlans,
    mealTemplates: state.mealTemplates,
    standards: state.standards
  }), [state.goals, state.mealTemplates, state.profile, state.selectedDate, state.standards, state.weekPlan, state.weekPlans]);
  const visibleMessages = compact ? messages.slice(-3) : messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, isLoadingHistory]);

  useEffect(() => {
    startNewSession();
    void loadSessionsForSelectedDate();
    // A page/date change intentionally starts with an empty visible chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, pageContext, state.selectedDate]);

  useEffect(() => {
    if (!initialMessage || input.trim() || appliedInitialMessage === initialMessage) return;
    setInput(initialMessage);
    setAppliedInitialMessage(initialMessage);
  }, [appliedInitialMessage, initialMessage, input]);

  function resetVisibleChat() {
    startNewSession();
    setAiNotice("Neue Chat-Session gestartet. Frühere Gespräche bleiben im Verlauf des Tages abrufbar.");
  }

  function startNewSession() {
    setActiveThreadId(createChatSessionId(threadId, pageContext, state.selectedDate));
    setMessages([]);
    setPendingPlan(null);
    setAppliedIds([]);
    setError(null);
    setAiNotice(null);
  }

  async function loadSessionsForSelectedDate() {
    setIsLoadingSessions(true);

    try {
      const response = await fetch(`/api/coach/history?date=${encodeURIComponent(state.selectedDate)}`);
      const result = await response.json() as { sessions?: CoachChatSessionSummary[] };
      if (response.ok) setSessions(result.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function openSession(sessionThreadId: string) {
    setIsLoadingHistory(true);
    setError(null);
    setAiNotice(null);

    try {
      const response = await fetch(`/api/coach?threadId=${encodeURIComponent(sessionThreadId)}`);
      const result = await response.json() as { messages?: Array<{
        id: string;
        role: CoachChatMessage["role"];
        content: string;
        mode?: CoachMode;
        createdAt: string;
      }> };

      if (!response.ok) throw new Error("Session konnte nicht geladen werden.");

      setActiveThreadId(sessionThreadId);
      setMessages((result.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        mode: message.mode,
        createdAt: message.createdAt
      })));
      setPendingPlan(null);
      setAppliedIds([]);
    } catch {
      setError("Der gespeicherte Chat konnte gerade nicht geladen werden.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    setInput("");
    setError(null);
    setAiNotice(null);
    setIsSending(true);

    const userMessage = createMessage("user", message);
    setMessages((current) => [...current, userMessage]);

    if (isConfirmationMessage(message) && pendingPlan?.changes.length) {
      const applied = await applyConfirmedChanges(pendingPlan.changes);
      if (!applied) {
        setIsSending(false);
        return;
      }
      setAppliedIds((current) => [...current, pendingPlan.id]);
      setPendingPlan(null);
      const hasMealChanges = pendingPlan.changes.some((change) => change.type === "add_meal");
      const assistantMessage = createMessage(
        "assistant",
        hasMealChanges
          ? "Passt, ich habe das bestätigte Fueling dem Tag hinzugefügt."
          : "Passt, ich habe den bestätigten Vorschlag in deinen Wochenplan übernommen.",
        "change"
      );
      void persistLocalMessages([
        { role: "user", content: message },
        { role: "assistant", content: assistantMessage.content, mode: assistantMessage.mode }
      ], activeThreadId, state.selectedDate, pageContext);
      setMessages((current) => [
        ...current,
        {
          ...assistantMessage,
          outcomes: [{
            type: "plan_change",
            domain: hasMealChanges ? "fueling" : "planning",
            summary: hasMealChanges ? "Bestätigtes Fueling wurde geloggt." : "Bestätigter Coach-Vorschlag wurde übernommen.",
            planChange: null
          }],
          changes: [],
          suggestions: [],
          questions: []
        }
      ]);
      setIsSending(false);
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          threadId: activeThreadId,
          pageContext,
          state: payloadState
        })
      });

      if (!response.ok) {
        throw new Error("Coach-Antwort konnte nicht geladen werden.");
      }

      const result = await response.json() as CoachPlanResponse;
      if (result.ai?.status === "fallback") {
        setAiNotice(formatAiDebugNotice(result.ai));
      }
      const proposalChanges = [...result.changes, ...collectSuggestionChanges(result.suggestions)];
      if (proposalChanges.length > 0) {
        setPendingPlan({ id: `proposal-${Date.now().toString(36)}`, changes: proposalChanges });
      }

      setMessages((current) => [
        ...current,
        {
          ...createMessage("assistant", result.assistantMessage, result.mode),
          outcomes: result.outcomes,
          changes: result.changes,
          suggestions: result.suggestions,
          questions: result.questions
        }
      ]);
      void loadSessionsForSelectedDate();
    } catch {
      setError("Der Coach konnte gerade nicht antworten. Deine Planung wurde nicht verändert.");
    } finally {
      setIsSending(false);
    }
  }

  async function applyChanges(changes: CoachPlanChange[], id: string, options?: { saveMealAsStandard?: boolean; standardOnly?: boolean }) {
    if (changes.length === 0 || appliedIds.includes(id)) return;

    const applied = await applyConfirmedChanges(changes, options);
    if (!applied) return;

    setAppliedIds((current) => [...current, id]);
    setPendingPlan(null);
    const hasMealChanges = changes.some((change) => change.type === "add_meal");
    const assistantMessage = createMessage(
      "assistant",
      hasMealChanges
        ? options?.saveMealAsStandard
          ? "Gespeichert. Ich habe das Fueling heute hinzugefügt und als Standard abgelegt."
          : options?.standardOnly
            ? "Gespeichert. Ich habe das Fueling als Standard abgelegt."
          : "Gespeichert. Ich habe das Fueling dem Tag hinzugefügt."
        : "Übernommen. Ich habe den bestätigten Vorschlag in deinen Wochenplan eingetragen.",
      "change"
    );
    void persistLocalMessages([
      { role: "assistant", content: assistantMessage.content, mode: assistantMessage.mode }
    ], activeThreadId, state.selectedDate, pageContext);
    setMessages((current) => [
      ...current,
      {
        ...assistantMessage,
        outcomes: [{
          type: "plan_change",
          domain: "planning",
          summary: "Vorschlag nach Bestätigung übernommen.",
          planChange: null
        }],
        changes: [],
        suggestions: [],
        questions: []
      }
    ]);
  }

  async function applyConfirmedChanges(changes: CoachPlanChange[], options?: { saveMealAsStandard?: boolean; standardOnly?: boolean }): Promise<boolean> {
    const planChanges = changes.filter((change) => change.type !== "add_meal");
    const mealChanges = changes.filter((change): change is Extract<CoachPlanChange, { type: "add_meal" }> => change.type === "add_meal");
    let allChangesApplied = true;

    if (planChanges.length > 0) {
      applyCoachPlanChanges(planChanges);
    }

    for (const change of mealChanges) {
      const saveAsStandard = options?.saveMealAsStandard ?? change.meal.saveAsStandard ?? false;
      const template = coachMealToTemplate(change.meal);
      if (options?.standardOnly) {
        addMealTemplate(template);
        continue;
      }

      const day = state.weekPlans.flatMap((week) => week.days).find((item) => item.date === change.date) ?? state.weekPlan.days.find((item) => item.date === change.date);
      const category = inferMealCategory(template);
      const role = mealCategoryToRole(category);
      const loggedTime = estimateMealLogTime(template, day);
      const savedLog = await addLog({
        date: change.date,
        time: loggedTime,
        name: change.meal.name,
        description: change.meal.description,
        source: "ai_estimate",
        values: coachMealToNutritionValues(change.meal),
        confidence: "medium",
        rationale: "Aus dem Coach-Chat übernommen. Grobe Schätzung, nicht grammgenau.",
        manuallyConfirmed: false,
        rawInput: change.meal.description,
        category: coachMealRoleToLogCategory(role),
        isMainMeal: false
      });

      if (savedLog && saveAsStandard) addMealTemplate(template);

      if (!savedLog) {
        setError(`${change.meal.name} konnte gerade nicht als Mahlzeit gespeichert werden. Ich habe den Plan nicht heimlich verändert.`);
        allChangesApplied = false;
      }
    }

    return allChangesApplied;
  }

  return (
    <Panel id="coach">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Coach</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetVisibleChat}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:bg-canvas hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Neu
          </button>
          <Pill tone="blue">Beta</Pill>
        </div>
      </div>

      <details className="mb-3 rounded-2xl border border-line bg-white px-3 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
          <span className="inline-flex items-center gap-2">
            <History className="h-4 w-4 text-coach-700" aria-hidden="true" />
            Frühere Chats am aktiven Tag
          </span>
          <span className="text-xs font-medium text-muted">{isLoadingSessions ? "lädt..." : `${sessions.length}`}</span>
        </summary>
        <div className="mt-3 grid gap-2">
          {sessions.length === 0 ? (
            <p className="rounded-xl bg-canvas px-3 py-2 text-sm text-muted">
              Noch keine gespeicherten Chats für diesen Tag.
            </p>
          ) : sessions.map((session) => (
            <button
              key={session.threadId}
              type="button"
              onClick={() => void openSession(session.threadId)}
              className="rounded-xl border border-line px-3 py-3 text-left transition hover:border-coach-200 hover:bg-coach-50"
            >
              <span className="block text-sm font-semibold text-ink">{session.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {formatSessionTime(session.updatedAt)} · {session.messageCount} Nachrichten{session.preview ? ` · ${session.preview}` : ""}
              </span>
            </button>
          ))}
        </div>
      </details>

      <div className="rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Chatfenster
        </div>
        <div className={compact
          ? "grid max-h-[42dvh] min-h-64 gap-3 overflow-y-auto bg-canvas/50 p-3"
          : "grid max-h-[52dvh] min-h-[50dvh] gap-3 overflow-y-auto bg-canvas/50 p-3"}
        >
          {isLoadingHistory ? (
            <div className="rounded-xl bg-white px-3 py-3 text-sm leading-6 text-muted">
              Chat-Historie wird geladen...
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="rounded-xl bg-white px-3 py-3 text-sm leading-6 text-muted">
              {intro}
            </div>
          ) : visibleMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              appliedIds={appliedIds}
              onApply={applyChanges}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {pendingPlan ? (
        <div className="mt-3 rounded-xl border border-coach-100 bg-coach-50 px-3 py-2 text-xs leading-5 text-coach-800">
          Vorschlag wartet auf Bestätigung. Nutze den Button am Vorschlag oder antworte mit „speichern“.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {aiNotice ? (
        <div className="mt-3 whitespace-pre-line rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          {aiNotice}
        </div>
      ) : null}

      <form onSubmit={submitMessage} className="mt-4 grid gap-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="z. B. Was esse ich vor dem Tempolauf? Oder: Gib mir ein schnelles Rezept für heute."
          rows={3}
          className="min-h-24 resize-none rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-coach-400"
          aria-label="Nachricht an den Coach"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
          An Coach senden
        </button>
      </form>
    </Panel>
  );
}

async function persistLocalMessages(messages: Array<{
  role: "user" | "assistant";
  content: string;
  mode?: CoachMode;
}>, threadId: string, selectedDate: string, pageContext: NonNullable<CoachChatPanelProps["pageContext"]>) {
  try {
    await fetch("/api/coach/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        selectedDate,
        pageContext,
        sessionTitle: messages.find((message) => message.role === "user")?.content ?? "Coach-Chat",
        messages
      })
    });
  } catch {
    // Chat history is helpful context, but it must never block the coach flow.
  }
}

function createChatSessionId(baseThreadId: string, pageContext: NonNullable<CoachChatPanelProps["pageContext"]>, selectedDate: string): string {
  return `${baseThreadId}-${pageContext}-${selectedDate}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatSessionTime(value: string | undefined): string {
  if (!value) return "gerade";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatAiDebugNotice(ai: NonNullable<CoachPlanResponse["ai"]>): string {
  const fallbackMessage = ai.message ?? "OpenAI ist nicht aktiv. Der regelbasierte Fallback antwortet.";

  if (!ai.debug) return fallbackMessage;

  return [
    fallbackMessage,
    "AI-Debug:",
    `HTTP Status: ${ai.debug.httpStatus ?? "n/a"}`,
    `Error Code: ${ai.debug.errorCode ?? "n/a"}`,
    `Message: ${ai.debug.message}`,
    `Model: ${ai.debug.model ?? "n/a"}`,
    `hasApiKey: ${ai.debug.hasApiKey ? "true" : "false"}`
  ].join("\n");
}

function ChatBubble({
  message,
  appliedIds,
  onApply
}: {
  message: CoachChatMessage;
  appliedIds: string[];
  onApply: (changes: CoachPlanChange[], id: string, options?: { saveMealAsStandard?: boolean; standardOnly?: boolean }) => void;
}) {
  const isAssistant = message.role === "assistant";
  const directChangeId = `${message.id}-changes`;

  return (
    <article className={isAssistant ? "rounded-xl bg-coach-50 px-3 py-3" : "rounded-xl bg-canvas px-3 py-3"}>
      <div className="mb-2 flex items-center gap-2">
        {isAssistant ? (
          <Sparkles className="h-4 w-4 text-coach-700" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-4 w-4 text-muted" aria-hidden="true" />
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {isAssistant ? "Coach" : "Du"}
        </p>
        {isAssistant && message.mode ? <ModePill mode={message.mode} /> : null}
      </div>
      <p className="whitespace-pre-line text-sm leading-6 text-ink">{message.content}</p>

      {message.mode === "change" && message.changes && message.changes.length > 0 ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Planänderung</p>
          {message.changes.map((change, index) => (
            <div key={`${change.type}-${index}`} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-coach-700" aria-hidden="true" />
              <span>{describeChange(change)}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onApply(message.changes ?? [], directChangeId)}
            disabled={appliedIds.includes(directChangeId)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {appliedIds.includes(directChangeId) ? "Übernommen" : "Änderungen übernehmen"}
          </button>
        </div>
      ) : null}

      {message.outcomes && message.outcomes.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {message.outcomes.map((outcome, index) => (
            <OutcomeRow key={`${outcome.type}-${index}`} outcome={outcome} />
          ))}
        </div>
      ) : null}

      {message.suggestions && message.suggestions.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {message.suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              applied={appliedIds.includes(suggestion.id)}
              onApply={(options) => onApply(suggestion.changes, suggestion.id, options)}
            />
          ))}
        </div>
      ) : null}

      {message.questions && message.questions.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {message.questions.map((question) => (
            <p key={question} className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-muted">
              {question}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ModePill({ mode }: { mode: CoachMode }) {
  const labels: Record<CoachMode, string> = {
    coach: "Beratung",
    planning: "Vorschlag",
    change: "Plan geändert"
  };
  const tones: Record<CoachMode, "blue" | "amber" | "green"> = {
    coach: "blue",
    planning: "amber",
    change: "green"
  };

  return <Pill tone={tones[mode]}>{labels[mode]}</Pill>;
}

function OutcomeRow({ outcome }: { outcome: CoachOutcome }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-muted">
      <span className="font-semibold text-ink">{outcomeLabel(outcome.type)}:</span>{" "}
      {outcome.summary}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  applied,
  onApply
}: {
  suggestion: CoachSuggestion;
  applied: boolean;
  onApply: (options?: { saveMealAsStandard?: boolean; standardOnly?: boolean }) => void;
}) {
  const mealChanges = suggestion.changes.filter((change) => change.type === "add_meal");
  const hasOnlyMealChanges = mealChanges.length > 0 && mealChanges.length === suggestion.changes.length;

  return (
    <article className="rounded-xl border border-line bg-white px-3 py-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{suggestion.title}</h3>
            <Pill tone={suggestion.kind === "recipe" || suggestion.kind === "fueling" ? "amber" : "green"}>
              {kindLabel(suggestion.kind)}
            </Pill>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{suggestion.summary}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{suggestion.rationale}</p>
        </div>
      </div>

      {suggestion.tips.length > 0 ? (
        <div className="mt-3 grid gap-1">
          {suggestion.tips.map((tip) => (
            <p key={tip} className="rounded-lg bg-canvas px-3 py-2 text-xs leading-5 text-muted">
              {tip}
            </p>
          ))}
        </div>
      ) : null}

      {suggestion.changes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApply()}
            disabled={applied}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {applied ? "Übernommen" : hasOnlyMealChanges ? "Zum Tag hinzufügen" : "In Planung übernehmen"}
          </button>
          {hasOnlyMealChanges ? (
            <>
              <button
                type="button"
                onClick={() => onApply({ saveMealAsStandard: true })}
                disabled={applied}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-coach-200 bg-white px-3 text-xs font-semibold text-coach-800 transition hover:bg-coach-50 disabled:cursor-not-allowed disabled:text-muted"
              >
                {applied ? "Standard gespeichert" : "Zum Tag + Standard"}
              </button>
              <button
                type="button"
                onClick={() => onApply({ standardOnly: true })}
                disabled={applied}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
              >
                Nur als Standard
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function coachMealToTemplate(meal: CoachMealDraft) {
  return {
    name: meal.name,
    description: meal.description,
    caloriesMin: meal.caloriesMin ?? meal.caloriesMax ?? 350,
    caloriesMax: meal.caloriesMax ?? meal.caloriesMin ?? 650,
    proteinMin: meal.proteinMin ?? meal.proteinMax ?? 20,
    proteinMax: meal.proteinMax ?? meal.proteinMin ?? 35,
    carbsGrams: meal.carbohydrateGrams,
    fatGrams: meal.fatGrams,
    category: inferMealCategory({
      name: meal.name,
      description: meal.description,
      tags: meal.tags ?? ["coach", "fueling"],
      category: undefined
    }),
    nutritionSource: "ai_estimate" as const,
    nutritionConfidence: "medium" as const,
    nutritionRationale: "Aus dem Coach-Chat übernommen.",
    tags: meal.tags ?? ["coach", "fueling"]
  };
}

function coachMealToNutritionValues(meal: CoachMealDraft) {
  const calories = midpoint(meal.caloriesMin, meal.caloriesMax, 500);
  const proteinGrams = midpoint(meal.proteinMin, meal.proteinMax, 25);
  const carbohydrateGrams = typeof meal.carbohydrateGrams === "number"
    ? meal.carbohydrateGrams
    : Math.round(calories * 0.45 / 4);
  const fatGrams = typeof meal.fatGrams === "number"
    ? meal.fatGrams
    : Math.round(Math.max(3, (calories - proteinGrams * 4 - carbohydrateGrams * 4) / 9));

  return {
    calories,
    proteinGrams,
    carbohydrateGrams,
    fatGrams
  };
}

function coachMealRoleToLogCategory(role: CoachMealDraft["role"]): MealLogCategory {
  if (role === "breakfast") return "breakfast";
  if (role === "dinner") return "dinner";
  if (role === "pre_workout" || role === "post_workout") return "snack";

  return "lunch";
}

function midpoint(min: number | undefined, max: number | undefined, fallback: number): number {
  if (typeof min === "number" && typeof max === "number") return Math.round((min + max) / 2);
  if (typeof min === "number") return Math.round(min);
  if (typeof max === "number") return Math.round(max);

  return fallback;
}

function describeChange(change: CoachPlanChange): string {
  if (change.type === "set_day_context") {
    const labels = {
      homeoffice: "Home-Office",
      office: "Büroarbeit",
      travel: "Reisetag",
      free: "Frei",
      vacation: "Urlaub"
    };

    return `${formatDate(change.date)} als ${labels[change.context]} gesetzt`;
  }

  if (change.type === "add_extra_info") {
    return `${formatDate(change.date)}: ${change.label} ergänzt`;
  }

  if (change.type === "add_workout") {
    return `${formatDate(change.date)}: ${change.workout.title} (${describeWorkoutType(change.workout)}) ergänzt`;
  }

  if (change.type === "move_workout") {
    return `${formatDate(change.fromDate)} → ${formatDate(change.toDate)}: Training verschoben`;
  }

  return `${formatDate(change.date)}: ${change.meal.name} um ${change.meal.time} ergänzt`;
}

function outcomeLabel(type: CoachOutcome["type"]): string {
  const labels: Record<CoachOutcome["type"], string> = {
    recommendation: "Empfehlung",
    clarification_question: "Rückfrage",
    plan_change: "Planänderung",
    no_change_note: "Keine Änderung"
  };

  return labels[type];
}

function kindLabel(kind: CoachSuggestion["kind"]): string {
  const labels: Record<CoachSuggestion["kind"], string> = {
    training: "Training",
    fueling: "Fueling",
    recipe: "Rezept",
    recovery: "Erholung",
    planning: "Planung"
  };

  return labels[kind];
}

function createMessage(role: CoachChatMessage["role"], content: string, mode?: CoachMode): CoachChatMessage {
  return {
    id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    mode
  };
}

function collectSuggestionChanges(suggestions: CoachSuggestion[]): CoachPlanChange[] {
  return suggestions.flatMap((suggestion) => suggestion.changes);
}

function isConfirmationMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();

  return /^(ja|jep|yes|ok|okay|passt|genau|klingt gut|übernehmen|uebernehmen|speichern|eintragen|mach das|so machen|nimm variante [abc])[\s.!]*$/.test(lower) ||
    lower.includes("übernimm den vorschlag") ||
    lower.includes("uebernimm den vorschlag");
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}
