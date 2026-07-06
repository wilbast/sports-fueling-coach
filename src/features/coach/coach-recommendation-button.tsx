"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Panel } from "@/components/ui";
import type { CoachPlanResponse } from "@/domain/coach/types";
import { useAppState } from "@/features/app-state/app-state-provider";

type CoachPageContext = "today" | "fueling" | "training" | "planning" | "insights" | "settings" | "coach";

type CoachRecommendationButtonProps = {
  pageContext: CoachPageContext;
  prompt: string;
  label?: string;
};

export function CoachRecommendationButton({
  pageContext,
  prompt,
  label = "Coach-Empfehlung"
}: CoachRecommendationButtonProps) {
  const { state } = useAppState();
  const [response, setResponse] = useState<CoachPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payloadState = useMemo(() => ({
    selectedDate: state.selectedDate,
    profile: state.profile,
    goals: state.goals,
    weekPlan: state.weekPlan,
    weekPlans: state.weekPlans,
    mealTemplates: state.mealTemplates,
    standards: state.standards
  }), [state.goals, state.mealTemplates, state.profile, state.selectedDate, state.standards, state.weekPlan, state.weekPlans]);

  async function requestRecommendation() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiResponse = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          pageContext,
          threadId: `recommendation-${pageContext}`,
          state: payloadState
        })
      });
      const result = await apiResponse.json() as CoachPlanResponse & { error?: string };

      if (!apiResponse.ok) {
        throw new Error(result.error ?? "Coach-Empfehlung konnte nicht geladen werden.");
      }

      setResponse(result);
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

      {response ? (
        <Panel className="fixed bottom-4 right-4 z-50 max-h-[55vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto bg-coach-50 shadow-soft">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-coach-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Coach-Empfehlung</p>
                <button
                  type="button"
                  onClick={() => setResponse(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-white hover:text-ink"
                  aria-label="Coach-Empfehlung schließen"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{response.assistantMessage}</p>
              {response.outcomes.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {response.outcomes.slice(0, 3).map((outcome, index) => (
                    <p key={`${outcome.type}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-muted">
                      {outcome.summary}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
