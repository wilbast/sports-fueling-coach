import { NextResponse } from "next/server";
import { resolveAiJsonClient } from "@/lib/ai/server";

type NutritionEstimateResponse = {
  name: string;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  source: "ai_estimate" | "fallback";
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { input?: string; servings?: number } | null;
  const input = body?.input?.trim();

  if (!input) {
    return NextResponse.json({ error: "input fehlt." }, { status: 400 });
  }

  const ai = resolveAiJsonClient();

  if (ai.status === "configured") {
    try {
      const raw = await ai.generateJson({
        systemPrompt: createSystemPrompt(),
        userPayload: {
          input,
          servings: body?.servings ?? 1
        },
        schemaName: "nutrition_estimate",
        schema: createNutritionEstimateSchema()
      });
      const parsed = JSON.parse(raw) as Partial<NutritionEstimateResponse>;

      return NextResponse.json({
        estimate: normalizeEstimate(parsed, input, "ai_estimate"),
        ai: {
          status: "configured",
          provider: ai.provider,
          model: ai.model
        }
      });
    } catch (error) {
      console.error("[nutrition/estimate] AI estimate failed", { message: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({
    estimate: createFallbackEstimate(input),
    ai: ai.status === "invalid"
      ? { status: "invalid", message: ai.message }
      : { status: "disabled" }
  });
}

function createSystemPrompt(): string {
  return [
    "Du bist ein deutschsprachiger Ernährungscoach.",
    "Schätze alltagstauglich Nährwerte für grobe Mahlzeiten, Snacks oder Getränke.",
    "Stelle Werte nie als exakt dar. Nutze confidence niedrig, mittel oder hoch.",
    "Wenn Angaben ungenau sind, schätze konservativ und erkläre kurz die Unsicherheit.",
    "Antworte ausschließlich als JSON im Schema.",
    "Felder: name, calories, proteinGrams, carbohydrateGrams, fatGrams, confidence, rationale.",
    "Alle Nährwerte beziehen sich auf die beschriebene gegessene Menge, nicht auf 100 g."
  ].join("\n");
}

function createNutritionEstimateSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["name", "calories", "proteinGrams", "carbohydrateGrams", "fatGrams", "confidence", "rationale"],
    properties: {
      name: { type: "string" },
      calories: { type: "number" },
      proteinGrams: { type: "number" },
      carbohydrateGrams: { type: "number" },
      fatGrams: { type: "number" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      rationale: { type: "string" }
    }
  };
}

function normalizeEstimate(
  estimate: Partial<NutritionEstimateResponse>,
  input: string,
  source: NutritionEstimateResponse["source"]
): NutritionEstimateResponse {
  return {
    name: typeof estimate.name === "string" && estimate.name.trim() ? estimate.name.trim() : createName(input),
    calories: normalizeNumber(estimate.calories, createFallbackEstimate(input).calories),
    proteinGrams: normalizeNumber(estimate.proteinGrams, createFallbackEstimate(input).proteinGrams),
    carbohydrateGrams: normalizeNumber(estimate.carbohydrateGrams, createFallbackEstimate(input).carbohydrateGrams),
    fatGrams: normalizeNumber(estimate.fatGrams, createFallbackEstimate(input).fatGrams),
    confidence: estimate.confidence === "low" || estimate.confidence === "medium" || estimate.confidence === "high" ? estimate.confidence : "medium",
    rationale: typeof estimate.rationale === "string" && estimate.rationale.trim()
      ? estimate.rationale.trim()
      : "Alltagstaugliche Schätzung auf Basis der Beschreibung.",
    source
  };
}

function createFallbackEstimate(input: string): NutritionEstimateResponse {
  const lower = input.toLowerCase();
  const calories = lower.includes("bowl") || lower.includes("reis") || lower.includes("nudel") || lower.includes("kartoffel")
    ? 650
    : lower.includes("skyr") || lower.includes("quark") || lower.includes("joghurt")
      ? 420
      : lower.includes("banane")
        ? 105
        : lower.includes("riegel") || lower.includes("snack")
          ? 180
        : 500;
  const protein = lower.includes("skyr") || lower.includes("quark") || lower.includes("protein")
    ? 35
    : lower.includes("hähnchen") || lower.includes("haehnchen") || lower.includes("tofu") || lower.includes("ei")
      ? 40
      : calories >= 500 ? 25 : 6;
  const carbs = lower.includes("banane") || lower.includes("müsli") || lower.includes("muesli") || lower.includes("reis") || lower.includes("nudel") || lower.includes("kartoffel")
    ? Math.round(calories * 0.55 / 4)
    : Math.round(calories * 0.35 / 4);
  const fat = Math.round(Math.max(3, (calories - protein * 4 - carbs * 4) / 9));

  return {
    name: createName(input),
    calories,
    proteinGrams: protein,
    carbohydrateGrams: carbs,
    fatGrams: fat,
    confidence: "low",
    rationale: "Fallback-Schätzung ohne KI. Bitte bei Bedarf manuell korrigieren.",
    source: "fallback"
  };
}

function createName(input: string): string {
  const trimmed = input.trim();
  return trimmed.length > 44 ? `${trimmed.slice(0, 41).trim()}...` : trimmed;
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}
