import { NextResponse } from "next/server";
import type { CoachMode } from "@/domain/coach/types";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SaveHistoryBody = {
  threadId?: string;
  messages?: Array<{
    role?: "user" | "assistant";
    content?: string;
    mode?: CoachMode;
  }>;
};

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
  const { error } = await supabase
    .from("coach_chat_messages")
    .insert(messages.map((message) => ({
      user_id: user.id,
      thread_id: threadId,
      role: message.role,
      content: message.content,
      mode: message.mode,
      metadata: {}
    })));

  if (error) {
    console.warn("[coach/history] messages could not be persisted", { message: error.message });
    return NextResponse.json({ ok: false, persisted: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
