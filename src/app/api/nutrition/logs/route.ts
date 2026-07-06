import { NextResponse } from "next/server";
import type { MealLog, MealLogCategory, NutritionConfidence, NutritionEstimateSource } from "@/domain/nutrition/logs";
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
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CreateMealLogBody = {
  id?: string;
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
  category?: MealLogCategory;
  isMainMeal?: boolean;
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
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, metadata, created_at")
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
      source_id: normalizeUuid(body.sourceId),
      calories: normalizeNumber(values.calories),
      protein_grams: normalizeNumber(values.proteinGrams),
      carbohydrate_grams: normalizeNumber(values.carbohydrateGrams),
      fat_grams: typeof values.fatGrams === "number" ? normalizeNumber(values.fatGrams) : null,
      confidence: normalizeConfidence(body.confidence),
      estimate_rationale: body.rationale?.trim() || null,
      manually_confirmed: Boolean(body.manuallyConfirmed),
      raw_input: body.rawInput?.trim() || body.description?.trim() || name,
      metadata: {
        category: normalizeCategory(body.category, body.time, name),
        isMainMeal: typeof body.isMainMeal === "boolean" ? body.isMainMeal : inferMainMeal(name, body.category)
      }
    })
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, metadata, created_at")
    .single();

  if (error) {
    console.error("[nutrition/logs] failed to insert meal log", { message: error.message });
    return NextResponse.json({ error: "Mahlzeit konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ log: mapMealLog(data as MealLogRow), source: "supabase" });
}

export async function PATCH(request: Request) {
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
  const id = body?.id?.trim();
  const name = body?.name?.trim();
  const date = body?.date?.trim();

  if (!body || !id || !name || !date) {
    return NextResponse.json({ error: "ID, Name und Datum sind erforderlich." }, { status: 400 });
  }

  const values = body.values ?? {};
  const { data, error } = await supabase
    .from("meal_logs")
    .update({
      logged_date: date,
      time_label: body.time?.trim() || null,
      name,
      description: body.description?.trim() || null,
      source: normalizeSource(body.source),
      source_id: normalizeUuid(body.sourceId),
      calories: normalizeNumber(values.calories),
      protein_grams: normalizeNumber(values.proteinGrams),
      carbohydrate_grams: normalizeNumber(values.carbohydrateGrams),
      fat_grams: typeof values.fatGrams === "number" ? normalizeNumber(values.fatGrams) : null,
      confidence: normalizeConfidence(body.confidence),
      estimate_rationale: body.rationale?.trim() || null,
      manually_confirmed: Boolean(body.manuallyConfirmed),
      raw_input: body.rawInput?.trim() || body.description?.trim() || name,
      metadata: {
        category: normalizeCategory(body.category, body.time, name),
        isMainMeal: Boolean(body.isMainMeal)
      }
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, logged_date, time_label, name, description, source, calories, protein_grams, carbohydrate_grams, fat_grams, confidence, estimate_rationale, manually_confirmed, metadata, created_at")
    .single();

  if (error) {
    console.error("[nutrition/logs] failed to update meal log", { message: error.message });
    return NextResponse.json({ error: "Mahlzeit konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ log: mapMealLog(data as MealLogRow), source: "supabase" });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, source: "demo" });
  }

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const date = url.searchParams.get("date");

  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[nutrition/logs] failed to delete meal log", { message: error.message });
    return NextResponse.json({ error: "Mahlzeit konnte nicht gelöscht werden." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date });
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
    category: normalizeCategory(row.metadata?.category, row.time_label, row.name),
    isMainMeal: typeof row.metadata?.isMainMeal === "boolean" ? row.metadata.isMainMeal : inferMainMeal(row.name, row.metadata?.category),
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

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmedValue)
    ? trimmedValue
    : null;
}

function normalizeCategory(value: unknown, time?: string | null, name?: string | null): MealLogCategory {
  if (value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack" || value === "drink") {
    return value;
  }

  const text = String(name ?? "").toLowerCase();
  if (text.includes("cappuccino") || text.includes("kaffee") || text.includes("wasser") || text.includes("bier") || text.includes("wein") || text.includes("drink")) {
    return "drink";
  }

  const hour = Number.parseInt(String(time ?? "").slice(0, 2), 10);
  if (Number.isFinite(hour)) {
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 18) return "snack";
    return "dinner";
  }

  return "snack";
}

function inferMainMeal(name: string | null | undefined, category: unknown): boolean {
  if (category === "drink" || category === "snack") return false;
  const text = String(name ?? "").toLowerCase();
  if (text.includes("cappuccino") || text.includes("kaffee") || text.includes("wasser") || text.includes("bier")) return false;

  return text.includes("chili") ||
    text.includes("bowl") ||
    text.includes("pasta") ||
    text.includes("lachs") ||
    text.includes("kartoff") ||
    text.includes("reis") ||
    category === "lunch" ||
    category === "dinner";
}
