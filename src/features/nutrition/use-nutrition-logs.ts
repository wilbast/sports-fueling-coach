"use client";

import { useCallback, useEffect, useState } from "react";
import type { MealLog, MealLogCategory, NutritionConfidence, NutritionEstimateSource, NutritionValues } from "@/domain/nutrition/logs";

const NUTRITION_LOGS_UPDATED_EVENT = "sports-fueling-coach:nutrition-logs-updated";

export type CreateMealLogInput = {
  date: string;
  time?: string;
  name: string;
  description?: string;
  source: NutritionEstimateSource;
  sourceId?: string;
  values: NutritionValues;
  confidence: NutritionConfidence;
  rationale?: string;
  manuallyConfirmed?: boolean;
  rawInput?: string;
  category?: MealLogCategory;
  isMainMeal?: boolean;
};

export type UpdateMealLogInput = CreateMealLogInput & {
  id: string;
};

export function useNutritionLogs(date: string) {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!date) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nutrition/logs?date=${encodeURIComponent(date)}`);
      const result = await response.json() as { logs?: MealLog[]; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeiten konnten nicht geladen werden.");
      }

      setLogs(result.logs ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Mahlzeiten konnten nicht geladen werden.");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      if (!detail?.date || detail.date === date) {
        void refresh();
      }
    }

    window.addEventListener(NUTRITION_LOGS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(NUTRITION_LOGS_UPDATED_EVENT, handleUpdate);
  }, [date, refresh]);

  const addLog = useCallback(async (input: CreateMealLogInput): Promise<MealLog | null> => {
    setError(null);

    try {
      const response = await fetch("/api/nutrition/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json() as { log?: MealLog; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gespeichert werden.");
      }

      window.dispatchEvent(new CustomEvent(NUTRITION_LOGS_UPDATED_EVENT, { detail: { date: input.date } }));
      return result.log ?? null;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mahlzeit konnte nicht gespeichert werden.");
      return null;
    }
  }, []);

  const updateLog = useCallback(async (input: UpdateMealLogInput): Promise<MealLog | null> => {
    setError(null);

    try {
      const response = await fetch("/api/nutrition/logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json() as { log?: MealLog; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gespeichert werden.");
      }

      window.dispatchEvent(new CustomEvent(NUTRITION_LOGS_UPDATED_EVENT, { detail: { date: input.date } }));
      return result.log ?? null;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mahlzeit konnte nicht gespeichert werden.");
      return null;
    }
  }, []);

  const deleteLog = useCallback(async (id: string, inputDate = date): Promise<boolean> => {
    setError(null);

    try {
      const params = new URLSearchParams({ id, date: inputDate });
      const response = await fetch(`/api/nutrition/logs?${params.toString()}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gelöscht werden.");
      }

      window.dispatchEvent(new CustomEvent(NUTRITION_LOGS_UPDATED_EVENT, { detail: { date: inputDate } }));
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Mahlzeit konnte nicht gelöscht werden.");
      return false;
    }
  }, [date]);

  return {
    logs,
    isLoading,
    error,
    refresh,
    addLog,
    updateLog,
    deleteLog
  };
}
