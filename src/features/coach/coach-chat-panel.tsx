"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, MessageCircle, SendHorizontal, Sparkles } from "lucide-react";
import { Panel, Pill } from "@/components/ui";
import type { CoachChatMessage, CoachOutcome, CoachPlanChange, CoachPlanResponse, CoachSuggestion } from "@/domain/coach/types";
import { describeWorkoutType } from "@/domain/training/catalog";
import { useAppState } from "@/features/app-state/app-state-provider";

type CoachChatPanelProps = {
  title?: string;
  intro?: string;
  compact?: boolean;
};

export function CoachChatPanel({
  title = "Coach fragen",
  intro = "Frag nach Training, Fueling, Rezepten, Regeneration oder Tagesstrategie.",
  compact = false
}: CoachChatPanelProps) {
  const { state, applyCoachPlanChanges } = useAppState();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const payloadState = useMemo(() => ({
    selectedDate: state.selectedDate,
    profile: state.profile,
    goals: state.goals,
    weekPlan: state.weekPlan,
    weekPlans: state.weekPlans,
    mealTemplates: state.mealTemplates,
    standards: state.standards
  }), [state.goals, state.mealTemplates, state.profile, state.selectedDate, state.standards, state.weekPlan, state.weekPlans]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    setInput("");
    setError(null);
    setIsSending(true);

    const userMessage = createMessage("user", message);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          state: payloadState
        })
      });

      if (!response.ok) {
        throw new Error("Coach-Antwort konnte nicht geladen werden.");
      }

      const result = await response.json() as CoachPlanResponse;

      setMessages((current) => [
        ...current,
        {
          ...createMessage("assistant", result.assistantMessage),
          outcomes: result.outcomes,
          changes: result.changes,
          suggestions: result.suggestions,
          questions: result.questions
        }
      ]);
    } catch {
      setError("Der Coach konnte gerade nicht antworten. Deine Planung wurde nicht verändert.");
    } finally {
      setIsSending(false);
    }
  }

  function applyChanges(changes: CoachPlanChange[], id: string) {
    if (changes.length === 0 || appliedIds.includes(id)) return;

    applyCoachPlanChanges(changes);
    setAppliedIds((current) => [...current, id]);
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
        <Pill tone="blue">Beta</Pill>
      </div>

      <div className="grid gap-3">
        {messages.length === 0 ? (
          <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
            {intro}
          </div>
        ) : messages.slice(compact ? -3 : -6).map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            appliedIds={appliedIds}
            onApply={applyChanges}
          />
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
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

function ChatBubble({
  message,
  appliedIds,
  onApply
}: {
  message: CoachChatMessage;
  appliedIds: string[];
  onApply: (changes: CoachPlanChange[], id: string) => void;
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
      </div>
      <p className="text-sm leading-6 text-ink">{message.content}</p>

      {message.changes && message.changes.length > 0 ? (
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
              onApply={() => onApply(suggestion.changes, suggestion.id)}
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
  onApply: () => void;
}) {
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
        <button
          type="button"
          onClick={onApply}
          disabled={applied}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {applied ? "Übernommen" : "In Planung übernehmen"}
        </button>
      ) : null}
    </article>
  );
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

function createMessage(role: CoachChatMessage["role"], content: string): CoachChatMessage {
  return {
    id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}
