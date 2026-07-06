"use client";

import { FormEvent, useMemo, useState } from "react";
import { Beef, Bot, CheckCircle2, Loader2, Salad, SendHorizontal, Soup, Wheat } from "lucide-react";
import { Panel, Pill } from "@/components/ui";
import type { MealLogCategory, NutritionConfidence } from "@/domain/nutrition/logs";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { useAppState } from "@/features/app-state/app-state-provider";
import { useNutritionLogs } from "@/features/nutrition/use-nutrition-logs";

const mealIcons = [Salad, Beef, Soup, Wheat];

type QuickFuelingPanelProps = {
  date: string;
  compact?: boolean;
};

type FuelingDraft = {
  template: {
    name: string;
    description: string;
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    carbsGrams: number;
    fatGrams: number;
    tags: string[];
  };
  slot: Omit<MealPlanSlot, "mealTemplateId">;
  saveAsStandard: boolean;
  confidence: NutritionConfidence;
  rationale: string;
  source: "ai_estimate" | "free_text";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function QuickFuelingPanel({ date, compact = false }: QuickFuelingPanelProps) {
  const { state, addMealSlot, addMealEntry, addMealTemplate } = useAppState();
  const { addLog } = useNutritionLogs(date);
  const standards = state.mealTemplates.filter((meal) => meal.isStandard !== false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<FuelingDraft | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const latestMessages = compact ? messages.slice(-3) : messages.slice(-5);
  const currentDayMealCount = useMemo(() => {
    const selectedWeek = state.weekPlans.find((week) => week.days.some((day) => day.date === date)) ?? state.weekPlan;
    return selectedWeek.days.find((day) => day.date === date)?.mealPlan.length ?? 0;
  }, [date, state.weekPlan, state.weekPlans]);

  async function addStandardToDay(meal: MealTemplate) {
    const slot = {
      time: inferNextMealTime(currentDayMealCount),
      role: inferMealRole(meal),
      mealTemplateId: meal.id
    };
    const savedLog = await addLog({
      date,
      time: slot.time,
      name: meal.name,
      description: meal.description,
      source: "standard",
      sourceId: meal.id,
      values: {
        calories: midpoint(meal.estimatedCalories.min, meal.estimatedCalories.max),
        proteinGrams: midpoint(meal.estimatedProteinGrams.min, meal.estimatedProteinGrams.max),
        carbohydrateGrams: midpoint(meal.estimatedCarbohydratesGrams?.min, meal.estimatedCarbohydratesGrams?.max),
        fatGrams: midpoint(meal.estimatedFatGrams?.min, meal.estimatedFatGrams?.max)
      },
      confidence: meal.nutritionConfidence ?? "manual",
      rationale: meal.nutritionRationale,
      manuallyConfirmed: meal.nutritionSource === "manual" || meal.nutritionConfidence === "manual",
      rawInput: meal.description,
      category: mealRoleToLogCategory(slot.role),
      isMainMeal: inferMainMealFromTemplate(meal, slot.role)
    });

    if (!savedLog) {
      addMealSlot(date, slot);
    }

    setMessages((current) => [
      ...current,
      createChatMessage("assistant", `${meal.name} wurde für heute hinzugefügt.`)
    ]);
  }

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isEstimating) return;

    setInput("");
    setMessages((current) => [...current, createChatMessage("user", message)]);

    if (isSaveMessage(message)) {
      if (!draft) {
        setMessages((current) => [...current, createChatMessage("assistant", "Ich habe noch keinen Fueling-Entwurf. Schreib mir kurz, was du gegessen oder geplant hast.")]);
        return;
      }

      const savedLog = await addLog({
        date,
        time: draft.slot.time,
        name: draft.template.name,
        description: draft.template.description,
        source: draft.source,
        values: {
          calories: midpoint(draft.template.caloriesMin, draft.template.caloriesMax),
          proteinGrams: midpoint(draft.template.proteinMin, draft.template.proteinMax),
          carbohydrateGrams: draft.template.carbsGrams,
          fatGrams: draft.template.fatGrams
        },
        confidence: draft.confidence,
        rationale: draft.rationale,
        manuallyConfirmed: false,
        rawInput: draft.template.description,
        category: mealRoleToLogCategory(draft.slot.role),
        isMainMeal: inferMainMealFromDraft(draft)
      });

      if (!savedLog) {
        addMealEntry(date, draft.template, draft.slot, { saveAsStandard: draft.saveAsStandard });
      } else if (draft.saveAsStandard) {
        addMealTemplate(draft.template);
      }
      setMessages((current) => [...current, createChatMessage("assistant", `${draft.template.name} ist für heute gespeichert.`)]);
      setDraft(null);
      return;
    }

    setIsEstimating(true);
    const nextDraft = await createFuelingDraft(message, currentDayMealCount);
    setIsEstimating(false);
    setDraft(nextDraft);
    setMessages((current) => [
      ...current,
      createChatMessage(
        "assistant",
        `Ich würde das als ${nextDraft.template.name} um ${nextDraft.slot.time} speichern: ca. ${midpoint(nextDraft.template.caloriesMin, nextDraft.template.caloriesMax)} kcal, ${midpoint(nextDraft.template.proteinMin, nextDraft.template.proteinMax)} g Protein, ${nextDraft.template.carbsGrams} g Kohlenhydrate, ${nextDraft.template.fatGrams} g Fett. ${confidenceLabel(nextDraft.confidence)}. Schreib "speichern", wenn das passt.`
      )
    ]);
  }

  function updateDraftValue(field: "calories" | "protein" | "carbs" | "fat", value: string) {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return;

    setDraft((current) => {
      if (!current) return current;
      const rounded = Math.max(0, Math.round(parsed));

      if (field === "calories") {
        return {
          ...current,
          template: {
            ...current.template,
            caloriesMin: rounded,
            caloriesMax: rounded
          },
          confidence: "manual",
          source: "free_text"
        };
      }

      if (field === "protein") {
        return {
          ...current,
          template: {
            ...current.template,
            proteinMin: rounded,
            proteinMax: rounded
          },
          confidence: "manual",
          source: "free_text"
        };
      }

      return {
        ...current,
        template: {
          ...current.template,
          [field === "carbs" ? "carbsGrams" : "fatGrams"]: rounded
        },
        confidence: "manual",
        source: "free_text"
      };
    });
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Fueling</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Heute hinzufügen</h2>
        </div>
        <Pill tone="amber">{standards.length} Standards</Pill>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {standards.slice(0, compact ? 4 : 8).map((meal, index) => {
            const Icon = mealIcons[index % mealIcons.length];

            return (
              <button
                key={meal.id}
                type="button"
                onClick={() => addStandardToDay(meal)}
                className="rounded-xl border border-line bg-white px-3 py-3 text-left transition hover:border-coach-200 hover:bg-coach-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{meal.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{meal.description}</p>
                    <p className="mt-2 text-xs font-semibold text-coach-700">{formatMealEstimate(meal)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl bg-canvas p-3">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-coach-700" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-ink">Per Chat</h3>
          </div>

          <div className="grid gap-2">
            {latestMessages.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-2 text-sm leading-6 text-muted">
                Schreib z. B. Skyr mit Banane nach dem Lauf oder Protein Bowl 700 kcal. Ich frage nicht unnötig, sondern baue erst einen Entwurf.
              </p>
            ) : latestMessages.map((message) => (
              <p
                key={message.id}
                className={message.role === "assistant"
                  ? "rounded-lg bg-white px-3 py-2 text-sm leading-6 text-ink"
                  : "rounded-lg bg-coach-50 px-3 py-2 text-sm leading-6 text-ink"}
              >
                {message.content}
              </p>
            ))}
          </div>

          {draft ? (
            <div className="mt-3 rounded-lg border border-coach-100 bg-white px-3 py-3 text-xs leading-5 text-muted">
              <div>
                <span className="font-semibold text-ink">Entwurf:</span> {draft.template.name} · {draft.slot.time} · {roleLabel(draft.slot.role)}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <NutritionDraftInput
                  label="kcal"
                  value={midpoint(draft.template.caloriesMin, draft.template.caloriesMax)}
                  onChange={(value) => updateDraftValue("calories", value)}
                />
                <NutritionDraftInput
                  label="Protein"
                  value={midpoint(draft.template.proteinMin, draft.template.proteinMax)}
                  onChange={(value) => updateDraftValue("protein", value)}
                />
                <NutritionDraftInput
                  label="Carbs"
                  value={draft.template.carbsGrams}
                  onChange={(value) => updateDraftValue("carbs", value)}
                />
                <NutritionDraftInput
                  label="Fett"
                  value={draft.template.fatGrams}
                  onChange={(value) => updateDraftValue("fat", value)}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={draft.saveAsStandard}
                  onChange={(event) => setDraft((current) => current ? { ...current, saveAsStandard: event.target.checked } : current)}
                  className="h-4 w-4 rounded border-line text-coach-600"
                />
                Als Standardmahlzeit speichern
              </label>
            </div>
          ) : null}

          <form onSubmit={submitChat} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={draft ? "speichern" : "Was hast du gegessen oder geplant?"}
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Fueling per Chat hinzufügen"
            />
            <button
              type="submit"
              disabled={!input.trim() || isEstimating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:cursor-not-allowed disabled:bg-muted"
            >
              {isEstimating
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : draft && isSaveMessage(input)
                  ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
              {isEstimating ? "Schätzt" : draft && isSaveMessage(input) ? "Speichern" : "Senden"}
            </button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

function NutritionDraftInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="min-h-9 rounded-lg border border-line bg-white px-2 text-xs font-normal text-ink outline-none transition focus:border-coach-400"
      />
    </label>
  );
}

async function createFuelingDraft(message: string, mealCount: number): Promise<FuelingDraft> {
  const estimate = await estimateNutrition(message);
  const lower = message.toLowerCase();
  const calories = estimate.calories;
  const protein = estimate.proteinGrams;
  const role = inferRole(lower);

  return {
    template: {
      name: estimate.name,
      description: message,
      caloriesMin: calories,
      caloriesMax: calories,
      proteinMin: protein,
      proteinMax: protein,
      carbsGrams: estimate.carbohydrateGrams,
      fatGrams: estimate.fatGrams,
      tags: ["chat", "fueling", role]
    },
    slot: {
      time: inferTime(lower) ?? inferNextMealTime(mealCount),
      role
    },
    saveAsStandard: false,
    confidence: estimate.source === "fallback" ? "low" : estimate.confidence,
    rationale: estimate.rationale,
    source: estimate.source === "fallback" ? "free_text" : "ai_estimate"
  };
}

async function estimateNutrition(input: string): Promise<{
  name: string;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  source: "ai_estimate" | "fallback";
}> {
  try {
    const response = await fetch("/api/nutrition/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input })
    });
    const result = await response.json() as {
      estimate?: {
        name: string;
        calories: number;
        proteinGrams: number;
        carbohydrateGrams: number;
        fatGrams: number;
        confidence: "low" | "medium" | "high";
        rationale: string;
        source: "ai_estimate" | "fallback";
      };
    };

    if (response.ok && result.estimate) {
      return result.estimate;
    }
  } catch {
    // Fallback below keeps logging usable without AI/network.
  }

  const lower = input.toLowerCase();
  const calories = parseCalories(lower) ?? inferCalories(lower);
  const protein = parseProtein(lower) ?? inferProtein(lower);
  const carbs = Math.round(calories * 0.45 / 4);
  const fat = Math.round(Math.max(3, (calories - protein * 4 - carbs * 4) / 9));

  return {
    name: inferMealName(input),
    calories,
    proteinGrams: protein,
    carbohydrateGrams: carbs,
    fatGrams: fat,
    confidence: "low",
    rationale: "Fallback-Schätzung ohne KI. Bitte bei Bedarf manuell korrigieren.",
    source: "fallback"
  };
}

function createChatMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content
  };
}

function inferMealName(message: string): string {
  const cleaned = message
    .replace(/\b(speichern|gegessen|geplant|heute|bitte)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Fueling-Eintrag";
  return cleaned.length > 42 ? `${cleaned.slice(0, 39).trim()}...` : cleaned;
}

function inferRole(lower: string): MealPlanSlot["role"] {
  if (lower.includes("frühstück") || lower.includes("fruehstueck") || lower.includes("morgens")) return "breakfast";
  if (lower.includes("pre") || lower.includes("vor dem") || lower.includes("vor training") || lower.includes("vor lauf")) return "pre_workout";
  if (lower.includes("post") || lower.includes("nach dem") || lower.includes("nach training") || lower.includes("nach lauf")) return "post_workout";
  if (lower.includes("abend") || lower.includes("dinner")) return "dinner";

  return "lunch";
}

function inferTime(lower: string): string | undefined {
  const clockMatch = lower.match(/(?:um\s*)?(\d{1,2})[:.](\d{2})/);
  if (clockMatch) return `${clockMatch[1].padStart(2, "0")}:${clockMatch[2]}`;

  if (lower.includes("frühstück") || lower.includes("fruehstueck") || lower.includes("morgens")) return "08:00";
  if (lower.includes("mittag")) return "12:30";
  if (lower.includes("abend")) return "19:00";

  return undefined;
}

function inferNextMealTime(mealCount: number): string {
  const times = ["08:00", "12:30", "16:30", "19:00", "21:00"];
  return times[Math.min(mealCount, times.length - 1)];
}

function inferMealRole(meal: MealTemplate): MealPlanSlot["role"] {
  const text = `${meal.name} ${meal.tags.join(" ")}`.toLowerCase();
  if (text.includes("breakfast") || text.includes("frühstück")) return "breakfast";
  if (text.includes("pre")) return "pre_workout";
  if (text.includes("post") || text.includes("recovery")) return "post_workout";
  if (text.includes("dinner") || text.includes("abend")) return "dinner";

  return "lunch";
}

function mealRoleToLogCategory(role: MealPlanSlot["role"]): MealLogCategory {
  if (role === "breakfast") return "breakfast";
  if (role === "dinner") return "dinner";
  if (role === "pre_workout" || role === "post_workout") return "snack";

  return "lunch";
}

function inferMainMealFromTemplate(meal: MealTemplate, role: MealPlanSlot["role"]): boolean {
  if (role === "pre_workout" || role === "post_workout") return false;
  const text = `${meal.name} ${meal.description} ${meal.tags.join(" ")}`.toLowerCase();

  return role === "lunch" ||
    role === "dinner" ||
    text.includes("bowl") ||
    text.includes("pasta") ||
    text.includes("lachs") ||
    text.includes("chili") ||
    text.includes("reis");
}

function inferMainMealFromDraft(draft: FuelingDraft): boolean {
  if (draft.slot.role === "pre_workout" || draft.slot.role === "post_workout") return false;
  const text = `${draft.template.name} ${draft.template.description}`.toLowerCase();

  return draft.slot.role === "lunch" ||
    draft.slot.role === "dinner" ||
    text.includes("bowl") ||
    text.includes("pasta") ||
    text.includes("lachs") ||
    text.includes("chili") ||
    text.includes("reis");
}

function inferCalories(lower: string): number {
  if (lower.includes("bowl") || lower.includes("reis") || lower.includes("kartoffel")) return 650;
  if (lower.includes("skyr") || lower.includes("quark") || lower.includes("joghurt")) return 400;
  if (lower.includes("banane")) return 105;
  if (lower.includes("riegel") || lower.includes("snack")) return 180;

  return 500;
}

function inferProtein(lower: string): number {
  if (lower.includes("skyr") || lower.includes("quark") || lower.includes("protein")) return 35;
  if (lower.includes("hähnchen") || lower.includes("haehnchen") || lower.includes("tofu") || lower.includes("ei")) return 40;
  if (lower.includes("banane") || lower.includes("snack")) return 5;

  return 25;
}

function parseCalories(lower: string): number | undefined {
  const match = lower.match(/(\d{2,4})\s*(?:kcal|kalorien)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseProtein(lower: string): number | undefined {
  const match = lower.match(/(\d{1,3})\s*g\s*(?:protein|eiweiß|eiweiss)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function isSaveMessage(message: string): boolean {
  return /^(speichern|save|eintragen|übernehmen|uebernehmen|passt|ja|ok|okay)[\s.!]*$/i.test(message.trim());
}

function midpoint(min?: number, max?: number): number {
  if (typeof min === "number" && typeof max === "number") return Math.round((min + max) / 2);
  if (typeof min === "number") return Math.round(min);
  if (typeof max === "number") return Math.round(max);

  return 0;
}

function confidenceLabel(confidence: NutritionConfidence): string {
  if (confidence === "manual") return "Manuell bestätigt";
  if (confidence === "high") return "Hohe Sicherheit";
  if (confidence === "medium") return "Mittlere Sicherheit";

  return "Grobe KI-Schätzung";
}

function formatMealEstimate(meal: MealTemplate): string {
  return `${meal.estimatedCalories.min}-${meal.estimatedCalories.max} kcal · ${meal.estimatedProteinGrams.min}-${meal.estimatedProteinGrams.max} g Protein`;
}

function roleLabel(role: MealPlanSlot["role"]): string {
  const labels: Record<MealPlanSlot["role"], string> = {
    breakfast: "Frühstück",
    lunch: "Lunch",
    pre_workout: "Pre-Workout",
    post_workout: "Post-Workout",
    dinner: "Abendessen"
  };

  return labels[role];
}
