"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Pill } from "@/components/ui";
import type { MealLog, MealLogCategory } from "@/domain/nutrition/logs";
import { sourceLabel } from "@/domain/nutrition/logs";

const mealLogCategories: Array<{ value: MealLogCategory; label: string }> = [
  { value: "breakfast", label: "Frühstück" },
  { value: "lunch", label: "Mittagessen" },
  { value: "dinner", label: "Abendessen" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Getränk" }
];

export type MealLogUpdateInput = {
  id: string;
  date: string;
  time?: string;
  name: string;
  description?: string;
  source: MealLog["source"];
  values: MealLog["values"];
  confidence: MealLog["confidence"];
  rationale?: string;
  manuallyConfirmed?: boolean;
  category?: MealLogCategory;
  isMainMeal?: boolean;
};

type MealLogListProps = {
  logs: MealLog[];
  isLoading?: boolean;
  error?: string | null;
  emptyText: string;
  onUpdate: (input: MealLogUpdateInput) => Promise<MealLog | null>;
  onDelete: (id: string, date?: string) => Promise<boolean>;
};

export function MealLogList({
  logs,
  isLoading = false,
  error = null,
  emptyText,
  onUpdate,
  onDelete
}: MealLogListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Mahlzeiten werden geladen...</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p>;
  }

  if (logs.length === 0) {
    return <p className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">{emptyText}</p>;
  }

  return (
    <div className="grid gap-2">
      {logs.map((log) => (
        <MealLogCard
          key={log.id}
          log={log}
          isEditing={editingId === log.id}
          onEdit={() => setEditingId(log.id)}
          onCancel={() => setEditingId(null)}
          onUpdate={async (input) => {
            const updated = await onUpdate(input);
            if (updated) setEditingId(null);
          }}
          onDelete={async () => {
            const deleted = await onDelete(log.id, log.date);
            if (deleted) setEditingId(null);
          }}
        />
      ))}
    </div>
  );
}

function MealLogCard({
  log,
  isEditing,
  onEdit,
  onCancel,
  onUpdate,
  onDelete
}: {
  log: MealLog;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (input: MealLogUpdateInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [time, setTime] = useState(log.time ?? "");
  const [name, setName] = useState(log.name);
  const [description, setDescription] = useState(log.description ?? "");
  const [category, setCategory] = useState<MealLogCategory>(log.category);
  const [isMainMeal, setIsMainMeal] = useState(log.isMainMeal);
  const [calories, setCalories] = useState(String(log.values.calories));
  const [protein, setProtein] = useState(String(log.values.proteinGrams));
  const [carbs, setCarbs] = useState(String(log.values.carbohydrateGrams));
  const [fat, setFat] = useState(String(log.values.fatGrams ?? 0));

  useEffect(() => {
    if (!isEditing) return;
    setTime(log.time ?? "");
    setName(log.name);
    setDescription(log.description ?? "");
    setCategory(log.category);
    setIsMainMeal(log.isMainMeal);
    setCalories(String(log.values.calories));
    setProtein(String(log.values.proteinGrams));
    setCarbs(String(log.values.carbohydrateGrams));
    setFat(String(log.values.fatGrams ?? 0));
  }, [isEditing, log]);

  if (isEditing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          void onUpdate({
            id: log.id,
            date: log.date,
            time,
            name: name.trim(),
            description: description.trim() || undefined,
            source: log.source,
            values: {
              calories: parseNumber(calories, 0),
              proteinGrams: parseNumber(protein, 0),
              carbohydrateGrams: parseNumber(carbs, 0),
              fatGrams: parseNumber(fat, 0)
            },
            confidence: "manual",
            rationale: log.rationale ?? undefined,
            manuallyConfirmed: true,
            category,
            isMainMeal
          });
        }}
        className="rounded-xl border border-coach-100 bg-white px-3 py-3"
      >
        <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr]">
          <input value={time} onChange={(event) => setTime(event.target.value)} type="time" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Uhrzeit" />
          <input value={name} onChange={(event) => setName(event.target.value)} className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Name" />
        </div>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Beschreibung" className="mt-2 min-h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Beschreibung" />
        <div className="mt-2 grid gap-2 sm:grid-cols-5">
          <select value={category} onChange={(event) => setCategory(event.target.value as MealLogCategory)} className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kategorie">
            {mealLogCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input value={calories} onChange={(event) => setCalories(event.target.value)} inputMode="numeric" placeholder="kcal" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kalorien" />
          <input value={protein} onChange={(event) => setProtein(event.target.value)} inputMode="numeric" placeholder="Protein" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Protein" />
          <input value={carbs} onChange={(event) => setCarbs(event.target.value)} inputMode="numeric" placeholder="Carbs" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kohlenhydrate" />
          <input value={fat} onChange={(event) => setFat(event.target.value)} inputMode="numeric" placeholder="Fett" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Fett" />
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={isMainMeal} onChange={(event) => setIsMainMeal(event.target.checked)} className="h-4 w-4 rounded border-line text-coach-600" />
          Hauptmahlzeit
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white">
            <Save className="h-4 w-4" aria-hidden="true" />
            Speichern
          </button>
          <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted">
            <X className="h-4 w-4" aria-hidden="true" />
            Abbrechen
          </button>
          <button type="button" onClick={() => void onDelete()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-700">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Löschen
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-line px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{log.name}</p>
            <Pill tone="blue">{mealLogCategoryLabel(log.category)}</Pill>
            {log.isMainMeal ? <Pill tone="green">Hauptmahlzeit</Pill> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{log.time ?? "ohne Uhrzeit"} · {sourceLabel(log.source, log.manuallyConfirmed)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={log.manuallyConfirmed ? "green" : "amber"}>
            {log.confidence === "manual" ? "bestätigt" : "Schätzung"}
          </Pill>
          <button type="button" onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink" aria-label="Mahlzeit bearbeiten">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-coach-700">
        {log.values.calories} kcal · {log.values.proteinGrams} g Protein · {log.values.carbohydrateGrams} g Carbs{typeof log.values.fatGrams === "number" ? ` · ${log.values.fatGrams} g Fett` : ""}
      </p>
    </div>
  );
}

function mealLogCategoryLabel(category: MealLogCategory): string {
  return mealLogCategories.find((item) => item.value === category)?.label ?? "Snack";
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}
