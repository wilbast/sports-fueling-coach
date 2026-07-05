"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, SendHorizontal, Sparkles } from "lucide-react";
import { Panel, Pill } from "@/components/ui";
import type { CoachChatMessage, CoachPlanChange, CoachPlanResponse } from "@/domain/coach/types";
import { describeWorkoutType } from "@/domain/training/catalog";
import { useAppState } from "@/features/app-state/app-state-provider";

export function CoachChatPanel() {
  const { state, applyCoachPlanChanges } = useAppState();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payloadState = useMemo(() => ({
    selectedDate: state.selectedDate,
    profile: state.profile,
    goals: state.goals,
    weekPlan: state.weekPlan
  }), [state.goals, state.profile, state.selectedDate, state.weekPlan]);

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

      if (result.changes.length > 0) {
        applyCoachPlanChanges(result.changes);
      }

      setMessages((current) => [
        ...current,
        {
          ...createMessage("assistant", result.assistantMessage),
          changes: result.changes,
          questions: result.questions
        }
      ]);
    } catch {
      setError("Der Coach konnte gerade nicht antworten. Deine Planung wurde nicht verändert.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Panel id="coach">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Coach-Chat</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Planung per Chat</h2>
          </div>
        </div>
        <Pill tone="blue">Beta</Pill>
      </div>

      <div className="grid gap-3">
        {messages.length === 0 ? (
          <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
            Sag dem Coach, was sich an Alltag, Training oder Fueling ändert.
          </div>
        ) : messages.slice(-4).map((message) => (
          <ChatBubble key={message.id} message={message} />
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
          placeholder="z. B. Freitag 18 Uhr 8 km locker Basis, danach Biergarten"
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

function ChatBubble({ message }: { message: CoachChatMessage }) {
  const isAssistant = message.role === "assistant";

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
          {message.changes.map((change, index) => (
            <div key={`${change.type}-${index}`} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-coach-700" aria-hidden="true" />
              <span>{describeChange(change)}</span>
            </div>
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

function describeChange(change: CoachPlanChange): string {
  if (change.type === "set_day_context") {
    const labels = {
      homeoffice: "Home-Office",
      office: "Büroarbeit",
      travel: "Reisetag"
    };

    return `${formatDate(change.date)} als ${labels[change.context]} gesetzt`;
  }

  if (change.type === "add_extra_info") {
    return `${formatDate(change.date)}: ${change.label} ergänzt`;
  }

  if (change.type === "add_workout") {
    return `${formatDate(change.date)}: ${change.workout.title} (${describeWorkoutType(change.workout)}) ergänzt`;
  }

  return `${formatDate(change.date)}: ${change.meal.name} um ${change.meal.time} ergänzt`;
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
