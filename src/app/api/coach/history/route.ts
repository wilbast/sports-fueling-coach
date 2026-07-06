import { NextRequest, NextResponse } from "next/server";
import type { CoachMode } from "@/domain/coach/types";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SaveHistoryBody = {
  threadId?: string;
  selectedDate?: string;
  pageContext?: string;
  sessionTitle?: string;
  messages?: Array<{
    role?: "user" | "assistant";
    content?: string;
    mode?: CoachMode;
  }>;
};

type HistoryRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  mode: CoachMode | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ sessions: [] });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ sessions: [] });
  }

  const selectedDate = request.nextUrl.searchParams.get("date");
  const { data: rows, error } = await supabase
    .from("coach_chat_messages")
    .select("id, thread_id, role, content, mode, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(240);

  if (error) {
    console.warn("[coach/history] sessions could not be loaded", { message: error.message });
    return NextResponse.json({ sessions: [] });
  }

  const sessions = groupRowsIntoSessions((rows ?? []) as HistoryRow[], selectedDate);

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const body = await request.json().catch(() => null) as SaveHistoryBody | null;
  const messages = (body?.messages ?? [])
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content?.trim() ?? "",
      mode: message.mode
    }));

  if (messages.length === 0) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const threadId = body?.threadId?.trim() || "default";
  const metadata = {
    selectedDate: body?.selectedDate ?? null,
    pageContext: body?.pageContext ?? null,
    sessionTitle: body?.sessionTitle ?? null
  };
  const { error } = await supabase
    .from("coach_chat_messages")
    .insert(messages.map((message) => ({
      user_id: user.id,
      thread_id: threadId,
      role: message.role,
      content: message.content,
      mode: message.mode,
      metadata
    })));

  if (error) {
    console.warn("[coach/history] messages could not be persisted", { message: error.message });
    return NextResponse.json({ ok: false, persisted: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}

function groupRowsIntoSessions(rows: HistoryRow[], selectedDate: string | null) {
  const grouped = new Map<string, HistoryRow[]>();

  for (const row of rows) {
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const rowDate = typeof metadata.selectedDate === "string" ? metadata.selectedDate : inferDateFromThreadId(row.thread_id);
    if (selectedDate && rowDate !== selectedDate) continue;

    grouped.set(row.thread_id, [...(grouped.get(row.thread_id) ?? []), row]);
  }

  return Array.from(grouped.entries())
    .map(([threadId, sessionRows]) => {
      const sorted = [...sessionRows].sort((left, right) => left.created_at.localeCompare(right.created_at));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const metadata = isRecord(last?.metadata) ? last.metadata : {};
      const firstUserMessage = sorted.find((row) => row.role === "user")?.content;

      return {
        threadId,
        selectedDate: typeof metadata.selectedDate === "string" ? metadata.selectedDate : inferDateFromThreadId(threadId),
        pageContext: typeof metadata.pageContext === "string" ? metadata.pageContext : null,
        title: typeof metadata.sessionTitle === "string" && metadata.sessionTitle.trim()
          ? metadata.sessionTitle
          : summarizeTitle(firstUserMessage ?? last?.content ?? "Coach-Chat"),
        preview: summarizePreview(last?.content ?? ""),
        messageCount: sorted.length,
        startedAt: first?.created_at,
        updatedAt: last?.created_at
      };
    })
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 24);
}

function inferDateFromThreadId(threadId: string): string | null {
  return threadId.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

function summarizeTitle(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Coach-Chat";

  return cleaned.length > 54 ? `${cleaned.slice(0, 51).trim()}...` : cleaned;
}

function summarizePreview(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  return cleaned.length > 120 ? `${cleaned.slice(0, 117).trim()}...` : cleaned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
