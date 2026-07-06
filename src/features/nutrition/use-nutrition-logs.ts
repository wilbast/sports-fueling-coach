"use client";

import { useCallback, useEffect, useState } from "react";
import type { MealLog, MealLogCategory, NutritionConfidence, NutritionEstimateSource, NutritionValues } from "@/domain/nutrition/logs";

export const NUTRITION_LOGS_UPDATED_EVENT = "sports-fueling-coach:nutrition-logs-updated";
const LOCAL_NUTRITION_LOGS_STORAGE_KEY = "sports-fueling-coach:nutrition-logs:v1";

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
      const result = await response.json() as { logs?: MealLog[]; error?: string; source?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeiten konnten nicht geladen werden.");
      }

      if (result.source === "demo" || result.source === "anonymous") {
        setLogs(loadLocalMealLogsForDate(date));
      } else {
        setLogs(result.logs ?? []);
      }
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
      const result = await response.json() as { log?: MealLog | null; error?: string; source?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gespeichert werden.");
      }

      if (!result.log && (result.source === "demo" || result.source === "anonymous")) {
        const localLog = createLocalMealLog(input);
        saveLocalMealLog(localLog);
        window.dispatchEvent(new CustomEvent(NUTRITION_LOGS_UPDATED_EVENT, { detail: { date: input.date } }));
        return localLog;
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
      const result = await response.json() as { log?: MealLog | null; error?: string; source?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gespeichert werden.");
      }

      if (!result.log && (result.source === "demo" || result.source === "anonymous")) {
        const localLog = updateLocalMealLog(input);
        window.dispatchEvent(new CustomEvent(NUTRITION_LOGS_UPDATED_EVENT, { detail: { date: input.date } }));
        return localLog;
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
      const result = await response.json() as { error?: string; source?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Mahlzeit konnte nicht gelöscht werden.");
      }

      if (result.source === "demo" || result.source === "anonymous") {
        deleteLocalMealLog(id);
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

export function loadLocalMealLogsForDate(date: string): MealLog[] {
  return loadLocalMealLogs()
    .filter((log) => log.date === date)
    .sort(compareMealLogs);
}

function createLocalMealLog(input: CreateMealLogInput): MealLog {
  return {
    id: `local-meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    date: input.date,
    time: input.time?.trim() || null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    source: input.source,
    confidence: input.confidence,
    values: {
      calories: normalizeNumber(input.values.calories),
      proteinGrams: normalizeNumber(input.values.proteinGrams),
      carbohydrateGrams: normalizeNumber(input.values.carbohydrateGrams),
      fatGrams: typeof input.values.fatGrams === "number" ? normalizeNumber(input.values.fatGrams) : undefined
    },
    rationale: input.rationale?.trim() || null,
    manuallyConfirmed: Boolean(input.manuallyConfirmed),
    category: input.category ?? inferMealLogCategory(input.name, input.time),
    isMainMeal: typeof input.isMainMeal === "boolean" ? input.isMainMeal : false,
    createdAt: new Date().toISOString()
  };
}

function saveLocalMealLog(log: MealLog) {
  const logs = loadLocalMealLogs();
  saveLocalMealLogs([...logs, log].sort(compareMealLogs));
}

function updateLocalMealLog(input: UpdateMealLogInput): MealLog | null {
  const logs = loadLocalMealLogs();
  let updatedLog: MealLog | null = null;
  const nextLogs = logs.map((log) => {
    if (log.id !== input.id) return log;
    updatedLog = {
      ...log,
      date: input.date,
      time: input.time?.trim() || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      source: input.source,
      confidence: input.confidence,
      values: {
        calories: normalizeNumber(input.values.calories),
        proteinGrams: normalizeNumber(input.values.proteinGrams),
        carbohydrateGrams: normalizeNumber(input.values.carbohydrateGrams),
        fatGrams: typeof input.values.fatGrams === "number" ? normalizeNumber(input.values.fatGrams) : undefined
      },
      rationale: input.rationale?.trim() || null,
      manuallyConfirmed: Boolean(input.manuallyConfirmed),
      category: input.category ?? inferMealLogCategory(input.name, input.time),
      isMainMeal: typeof input.isMainMeal === "boolean" ? input.isMainMeal : false
    };

    return updatedLog;
  });

  saveLocalMealLogs(nextLogs.sort(compareMealLogs));
  return updatedLog;
}

function deleteLocalMealLog(id: string) {
  saveLocalMealLogs(loadLocalMealLogs().filter((log) => log.id !== id));
}

function loadLocalMealLogs(): MealLog[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(LOCAL_NUTRITION_LOGS_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue) as MealLog[];

    return Array.isArray(parsed) ? parsed.filter(isMealLog) : [];
  } catch {
    return [];
  }
}

function saveLocalMealLogs(logs: MealLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_NUTRITION_LOGS_STORAGE_KEY, JSON.stringify(logs));
}

function compareMealLogs(left: MealLog, right: MealLog): number {
  return `${left.date}${left.time ?? "99:99"}${left.createdAt ?? ""}`.localeCompare(`${right.date}${right.time ?? "99:99"}${right.createdAt ?? ""}`);
}

function isMealLog(value: unknown): value is MealLog {
  if (!value || typeof value !== "object") return false;
  const log = value as Partial<MealLog>;

  return typeof log.id === "string" &&
    typeof log.date === "string" &&
    typeof log.name === "string" &&
    typeof log.values?.calories === "number" &&
    typeof log.values?.proteinGrams === "number" &&
    typeof log.values?.carbohydrateGrams === "number";
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function inferMealLogCategory(name: string, time?: string): MealLogCategory {
  const text = name.toLowerCase();
  if (text.includes("kaffee") || text.includes("wasser") || text.includes("bier") || text.includes("wein") || text.includes("drink")) return "drink";

  const hour = Number.parseInt(String(time ?? "").slice(0, 2), 10);
  if (Number.isFinite(hour)) {
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 18) return "snack";
    return "dinner";
  }

  return "snack";
}
