import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type OAuthStatePayload = {
  userId: string;
  returnTo: string;
  exp: number;
  nonce: string;
};

export function createOAuthState(userId: string, returnTo = "/settings"): string {
  const payload: OAuthStatePayload = {
    userId,
    returnTo,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: cryptoRandom()
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);

  return `${body}.${signature}`;
}

export function verifyOAuthState(state: string, expectedUserId: string): OAuthStatePayload | null {
  const [body, signature] = state.split(".");
  if (!body || !signature) return null;

  const expectedSignature = sign(body);
  const valid = safeEqual(signature, expectedSignature);
  if (!valid) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as OAuthStatePayload;
    if (payload.userId !== expectedUserId || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  const secret = process.env.STRAVA_OAUTH_STATE_SECRET ?? process.env.STRAVA_CLIENT_SECRET ?? process.env.AI_API_KEY;
  if (!secret) throw new Error("OAuth-State Secret fehlt.");

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function cryptoRandom(): string {
  return randomBytes(18).toString("base64url");
}
