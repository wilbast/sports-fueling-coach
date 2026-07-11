import type { CoachPlanResponse } from "@/domain/coach/types";

type CoachStreamPayload = {
  message: string;
  threadId: string;
  pageContext: string;
  state: unknown;
};

type CoachStreamHandlers = {
  onDelta: (text: string) => void;
  onFinal: (response: CoachPlanResponse) => void;
};

export async function requestCoachStream(payload: CoachStreamPayload, handlers: CoachStreamHandlers) {
  const response = await fetch("/api/coach?stream=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Coach-Antwort konnte nicht geladen werden.");
  }

  if (!response.body) {
    const result = await response.json() as CoachPlanResponse & { error?: string };
    handlers.onFinal(result);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventText of events) {
        processStreamEvent(eventText, handlers);
      }
    }

    const tail = decoder.decode();
    if (tail) buffer += tail;
    if (buffer.trim()) processStreamEvent(buffer, handlers);
  } finally {
    reader.releaseLock();
  }
}

function processStreamEvent(eventText: string, handlers: CoachStreamHandlers) {
  const lines = eventText.split("\n");
  const event = lines.find((line) => line.startsWith("event:"))?.slice("event:".length).trim() ?? "message";
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  if (!data) return;

  const parsed = JSON.parse(data) as unknown;

  if (event === "delta" && isRecord(parsed) && typeof parsed.text === "string") {
    handlers.onDelta(parsed.text);
    return;
  }

  if (event === "final" && isRecord(parsed)) {
    handlers.onFinal(parsed as CoachPlanResponse);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
