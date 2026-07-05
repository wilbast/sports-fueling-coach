import { NextResponse } from "next/server";
import type { MealLog, NutritionConfidence, NutritionEstimateSource } from "@/domain/nutrition/logs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

type MealLogRow = {
  id: string;
  logged_date: string;
  time_label: string | null;
  name: string;
  description: string | null;
  source: string;
  calories: number;
  protein_grams: number;
  carbohydrate_grams: number;
  fat_grams: number | null;
  confidence: string;
  estimate_rationale: string | null;
  manually_confirmed: boolean;
  created_at: string;
};

type CreateMealLogBody = {
  date?: string;
  time?: string;
  name?: string;
  description?: string;
  source?: NutritionEstimateSource;
  sourceId?: string;
  values?: {
    calories?: number;
    proteinGrams?: number;
    carbohydrateGrams?: number;
    fatGrams?: number;
  };
  confidence?: NutritionConfidence;
  rationale?: string;
  manuallyConfirmed?: boolean;
  rawInput?: string;
};

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ logs: [], source: "demo" });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date fehlt." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ logs: [], source: "anonymous" });
  }

  const { data, error } = await supabase
    .from("meal_logs")
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, created_at")
    .eq("user_id", user.id)
    .eq("logged_date", date)
    .order("time_label", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[nutrition/logs] failed to load meal logs", { message: error.message });
    return NextResponse.json({ logs: [], error: "Mahlzeiten konnten nicht geladen werden." }, { status: 200 });
  }

  return NextResponse.json({
    logs: (data as MealLogRow[] | null ?? []).map(mapMealLog),
    source: "supabase"
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ log: null, source: "demo" });
  }

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as CreateMealLogBody | null;
  const name = body?.name?.trim();
  const date = body?.date?.trim();

  if (!body || !name || !date) {
    return NextResponse.json({ error: "Name und Datum sind erforderlich." }, { status: 400 });
  }

  const values = body.values ?? {};
  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: user.id,
      logged_date: date,
      time_label: body.time?.trim() || null,
      name,
      description: body.description?.trim() || null,
      source: normalizeSource(body.source),
      source_id: body.sourceId ?? null,
      calories: normalizeNumber(values.calories),
      protein_grams: normalizeNumber(values.proteinGrams),
      carbohydrate_grams: normalizeNumber(values.carbohydrateGrams),
      fat_grams: typeof values.fatGrams === "number" ? normalizeNumber(values.fatGrams) : null,
      confidence: normalizeConfidence(body.confidence),
      estimate_rationale: body.rationale?.trim() || null,
      manually_confirmed: Boolean(body.manuallyConfirmed),
      raw_input: body.rawInput?.trim() || body.description?.trim() || name,
      metadata: {}
    })
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, created_at")
    .single();

  if (error) {
    console.error("[nutrition/logs] failed to insert meal log", { message: error.message });
    return NextResponse.json({ error: "Mahlzeit konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ log: mapMealLog(data as MealLogRow), source: "supabase" });
}

function mapMealLog(row: MealLogRow): MealLog {
  return {
    id: row.id,
    date: row.logged_date,
    time: row.time_label,
    name: row.name,
    description: row.description,
    source: normalizeSource(row.source),
    confidence: normalizeConfidence(row.confidence),
    values: {
      calories: row.calories,
      proteinGrams: row.protein_grams,
      carbohydrateGrams: row.carbohydrate_grams,
      fatGrams: row.fat_grams ?? undefined
    },
    rationale: row.estimate_rationale,
    manuallyConfirmed: row.manually_confirmed,
    createdAt: row.created_at
  };
}

function normalizeSource(value: unknown): NutritionEstimateSource {
  if (value === "standard" || value === "recipe" || value === "free_text" || value === "ai_estimate" || value === "manual") {
    return value;
  }

  return "free_text";
}

function normalizeConfidence(value: unknown): NutritionConfidence {
  if (value === "low" || value === "medium" || value === "high" || value === "manual") {
    return value;
  }

  return "medium";
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
