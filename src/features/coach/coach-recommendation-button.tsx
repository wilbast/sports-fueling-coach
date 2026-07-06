"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { Panel } from "@/components/ui";
import type { CoachPlanResponse } from "@/domain/coach/types";
import { useAppState } from "@/features/app-state/app-state-provider";

type CoachPageContext = "today" | "fueling" | "training" | "planning" | "insights" | "settings" | "coach";

type CoachRecommendationButtonProps = {
  pageContext: CoachPageContext;
  prompt: string;
  label?: string;
};

type RecommendationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: CoachPlanResponse;
};

export function CoachRecommendationButton({
  pageContext,
  prompt,
  label = "Coach-Empfehlung"
}: CoachRecommendationButtonProps) {
  const { state } = useAppState();
  const threadId = `recommendation-${pageContext}`;
  const [messages, setMessages] = useState<RecommendationMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isOpen, messages.length, isLoading]);

  async function requestRecommendation() {
    if (isLoading) return;

    setIsOpen(true);
    await sendCoachMessage(prompt, { showUserMessage: false, reset: messages.length === 0 });
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = followUp.trim();
    if (!message || isLoading) return;

    setFollowUp("");
    await sendCoachMessage(message, { showUserMessage: true, apiMessage: createFollowUpPayload(message, messages) });
  }

  async function sendQuickFollowUp(message: string) {
    if (isLoading) return;

    setFollowUp("");
    await sendCoachMessage(message, { showUserMessage: true, apiMessage: createFollowUpPayload(message, messages) });
  }

  async function sendCoachMessage(message: string, options: { showUserMessage: boolean; reset?: boolean; apiMessage?: string }) {
    setIsLoading(true);
    setError(null);

    if (options.reset) setMessages([]);
    if (options.showUserMessage) {
      setMessages((current) => [...current, createRecommendationMessage("user", message)]);
    }

    try {
      const apiResponse = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: options.apiMessage ?? message,
          pageContext,
          threadId,
          state: payloadState
        })
      });
      const result = await apiResponse.json() as CoachPlanResponse & { error?: string };

      if (!apiResponse.ok) {
        throw new Error(result.error ?? "Coach-Empfehlung konnte nicht geladen werden.");
      }

      setMessages((current) => [
        ...current,
        createRecommendationMessage("assistant", result.assistantMessage, result)
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Coach-Empfehlung konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={requestRecommendation}
        disabled={isLoading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
        {label}
      </button>

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isOpen ? (
        <Panel className="fixed bottom-4 right-4 z-50 flex max-h-[72vh] w-[calc(100vw-2rem)] max-w-xl flex-col bg-coach-50 shadow-soft">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 shrink-0 text-coach-700" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Coach-Empfehlung</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-white hover:text-ink"
                  aria-label="Coach-Empfehlung schließen"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
              {messages.length === 0 && isLoading ? (
                <p className="rounded-lg bg-white px-3 py-2 text-sm leading-6 text-muted">Coach denkt nach...</p>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "assistant"
                    ? "rounded-xl bg-white px-3 py-3 text-sm leading-6 text-muted"
                    : "rounded-xl bg-coach-100 px-3 py-3 text-sm leading-6 text-ink"}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  {message.response?.outcomes?.length ? (
                    <div className="mt-3 grid gap-2">
                      {message.response.outcomes.slice(0, 3).map((outcome, index) => (
                        <p key={`${message.id}-${outcome.type}-${index}`} className="rounded-lg bg-canvas px-3 py-2 text-xs leading-5 text-muted">
                          {outcome.summary}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {isLoading && messages.length > 0 ? (
                <p className="rounded-lg bg-white px-3 py-2 text-sm leading-6 text-muted">Coach antwortet...</p>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendQuickFollowUp("Erkläre mir kurz, warum du das empfiehlst.")}
                disabled={isLoading}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Warum?
              </button>
              <button
                type="button"
                onClick={() => void sendQuickFollowUp("Gib mir bitte eine alltagstaugliche Alternative.")}
                disabled={isLoading}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Alternative
              </button>
              <button
                type="button"
                onClick={() => void sendQuickFollowUp("Gib mir bitte passende Rezeptvorschläge dazu.")}
                disabled={isLoading}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChefHat className="h-3.5 w-3.5" aria-hidden="true" />
                Rezepte
              </button>
            </div>

            <form onSubmit={submitFollowUp} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                placeholder="Rückfrage stellen oder Rezeptwunsch ergänzen..."
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Rückfrage zur Coach-Empfehlung"
              />
              <button
                type="submit"
                disabled={isLoading || !followUp.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
                Senden
              </button>
            </form>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function createRecommendationMessage(role: RecommendationMessage["role"], content: string, response?: CoachPlanResponse): RecommendationMessage {
  return {
    id: `recommendation-message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    response
  };
}

function createFollowUpPayload(message: string, messages: RecommendationMessage[]): string {
  const lastAssistantMessage = [...messages].reverse().find((item) => item.role === "assistant")?.content;
  if (!lastAssistantMessage) return message;

  return [
    "Beziehe dich auf diese vorige Coach-Empfehlung und antworte auf meine Rückfrage dazu.",
    `Vorige Empfehlung: ${lastAssistantMessage.slice(0, 1800)}`,
    `Rückfrage: ${message}`
  ].join("\n\n");
}
