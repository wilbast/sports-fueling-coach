import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function isGarminEncryptionConfigured(): boolean {
  return Boolean(getEncryptionKey());
}

export function getMissingGarminEncryptionEnvVars(): string[] {
  return getEncryptionKey() ? [] : ["GARMIN_TOKEN_ENCRYPTION_KEY oder INTEGRATION_ENCRYPTION_KEY"];
}

export function encryptGarminSecret(value: unknown): string {
  const key = requireEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptGarminSecret<T = unknown>(encryptedValue: string): T {
  const key = requireEncryptionKey();
  const [version, ivText, tagText, payloadText] = encryptedValue.split(".");

  if (version !== VERSION || !ivText || !tagText || !payloadText) {
    throw new Error("Garmin-Secret hat ein unbekanntes Format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"), { authTagLength: TAG_BYTES });
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadText, "base64url")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

export function maskGarminEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "Garmin-Account";

  const maskedName = name.length <= 2
    ? `${name.slice(0, 1)}***`
    : `${name.slice(0, 2)}***${name.slice(-1)}`;

  return `${maskedName}@${domain}`;
}

function requireEncryptionKey(): Buffer {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("Garmin Token Encryption Key ist nicht konfiguriert.");
  }

  return key;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.GARMIN_TOKEN_ENCRYPTION_KEY?.trim()
    || process.env.INTEGRATION_ENCRYPTION_KEY?.trim();

  if (!raw) return null;

  const normalized = raw.startsWith("base64:") ? raw.slice("base64:".length) : raw;
  const decoded = tryDecode(normalized);
  if (decoded?.length === 32) return decoded;

  return createHash("sha256").update(raw).digest();
}

function tryDecode(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64");
  } catch {
    return null;
  }
}
