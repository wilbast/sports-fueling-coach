import { Client, Receiver } from "@upstash/qstash";

export type GarminQStashJobMessage = {
  jobId: string;
  connectionId: string;
};

export function getMissingQStashEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.QSTASH_TOKEN?.trim()) missing.push("QSTASH_TOKEN");
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY?.trim()) missing.push("QSTASH_CURRENT_SIGNING_KEY");
  if (!process.env.QSTASH_NEXT_SIGNING_KEY?.trim()) missing.push("QSTASH_NEXT_SIGNING_KEY");
  if (!resolvePublicAppUrl()) missing.push("APP_URL oder VERCEL_PROJECT_PRODUCTION_URL");
  return missing;
}

export function assertQStashConfigured() {
  const missing = getMissingQStashEnvVars();
  if (missing.length > 0) throw new Error(`QStash ist nicht vollständig konfiguriert. Fehlend: ${missing.join(", ")}.`);
}

export async function readVerifiedQStashBody(request: Request): Promise<string> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
  if (!currentSigningKey || !nextSigningKey) throw new QStashConfigurationError("QStash Signing Keys sind nicht konfiguriert.");
  const signature = request.headers.get("upstash-signature");
  if (!signature) throw new QStashSignatureError("QStash-Signatur fehlt.");
  const body = await request.text();
  const receiver = new Receiver({ currentSigningKey, nextSigningKey });
  try {
    const publicUrl = resolvePublicAppUrl();
    const expectedUrl = publicUrl ? `${publicUrl}${new URL(request.url).pathname}` : undefined;
    const valid = await receiver.verify({ signature, body, url: expectedUrl });
    if (!valid) throw new QStashSignatureError("QStash-Signatur ist ungültig.");
  } catch (error) {
    if (error instanceof QStashSignatureError) throw error;
    throw new QStashSignatureError("QStash-Signatur ist ungültig.");
  }
  return body;
}

export class QStashSignatureError extends Error {}
export class QStashConfigurationError extends Error {}

export async function publishGarminSyncJob(message: GarminQStashJobMessage, deduplicationId: string) {
  assertQStashConfigured();
  const client = new Client({ token: process.env.QSTASH_TOKEN!.trim() });
  return client.publishJSON({
    url: `${resolvePublicAppUrl()}/api/internal/garmin/jobs/sync`,
    body: message,
    deduplicationId,
    retries: 5,
    retryDelay: "max(30000, pow(2, retried) * 30000)",
    timeout: 140,
    flowControl: {
      key: `garmin-${message.connectionId}`,
      parallelism: 1,
      rate: 1,
      period: "1m"
    },
    label: ["garmin", "sync"],
    redact: { body: true }
  });
}

export function resolvePublicAppUrl(): string | null {
  const explicit = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  return vercel ? `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : null;
}
