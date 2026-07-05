import "server-only";
import type { AiDebugInfo, AiJsonRequest, AiJsonResult, AiProvider } from "@/lib/ai/types";

const providerConfigs: Record<AiProvider, {
  endpoint: string;
  label: string;
}> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    label: "Groq"
  },
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    label: "OpenAI"
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    label: "OpenRouter"
  }
};

export function resolveAiJsonClient(): AiJsonResult {
  const rawProvider = process.env.AI_PROVIDER?.trim().toLowerCase() || (process.env.OPENAI_API_KEY?.trim() ? "openai" : "");

  if (!rawProvider) {
    return { status: "disabled" };
  }

  if (!isAiProvider(rawProvider)) {
    return {
      status: "invalid",
      message: `AI_PROVIDER="${rawProvider}" wird nicht unterstützt. Erlaubt sind: groq, openai, openrouter.`,
      debug: {
        httpStatus: null,
        errorCode: "unsupported_provider",
        message: `AI_PROVIDER="${rawProvider}" wird nicht unterstützt.`,
        model: process.env.AI_MODEL?.trim() || null,
        hasApiKey: Boolean(process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())
      }
    };
  }

  const providerConfig = providerConfigs[rawProvider];
  const model = process.env.AI_MODEL?.trim() || (rawProvider === "openai" ? "gpt-5-mini" : "");
  const apiKey = process.env.AI_API_KEY?.trim() || (rawProvider === "openai" ? process.env.OPENAI_API_KEY?.trim() : "");
  const apiKeyName = rawProvider === "openai" ? "OPENAI_API_KEY oder AI_API_KEY" : "AI_API_KEY";
  const missing = [
    model ? "" : "AI_MODEL",
    apiKey ? "" : apiKeyName
  ].filter(Boolean);

  if (missing.length > 0) {
    return {
      status: "invalid",
      message: `${providerConfig.label} ist als AI_PROVIDER gesetzt, aber ${missing.join(" und ")} ${missing.length === 1 ? "fehlt" : "fehlen"}.`,
      debug: {
        httpStatus: null,
        errorCode: "missing_ai_env",
        message: `${missing.join(" und ")} ${missing.length === 1 ? "fehlt" : "fehlen"}.`,
        model: model || null,
        hasApiKey: Boolean(apiKey)
      }
    };
  }

  if (!model || !apiKey) {
    return {
      status: "invalid",
      message: `${providerConfig.label} ist nicht vollständig konfiguriert.`,
      debug: {
        httpStatus: null,
        errorCode: "incomplete_ai_config",
        message: `${providerConfig.label} ist nicht vollständig konfiguriert.`,
        model: model || null,
        hasApiKey: Boolean(apiKey)
      }
    };
  }

  const configuredModel = model;
  const configuredApiKey = apiKey;

  return {
    status: "configured",
    provider: rawProvider,
    model: configuredModel,
    hasApiKey: Boolean(configuredApiKey),
    generateJson: (request) => requestProviderJson({
      ...request,
      endpoint: providerConfig.endpoint,
      apiKey: configuredApiKey,
      model: configuredModel,
      provider: rawProvider
    })
  };
}

type ProviderJsonRequest = AiJsonRequest & {
  endpoint: string;
  apiKey: string;
  model: string;
  provider: AiProvider;
};

export class AiProviderRequestError extends Error {
  debug: AiDebugInfo;

  constructor(debug: AiDebugInfo) {
    super(debug.message);
    this.name = "AiProviderRequestError";
    this.debug = debug;
  }
}

export function getAiErrorDebug(error: unknown, client: Extract<AiJsonResult, { status: "configured" }>): AiDebugInfo {
  if (error instanceof AiProviderRequestError) {
    return error.debug;
  }

  return {
    httpStatus: null,
    errorCode: "ai_request_failed",
    message: error instanceof Error && error.message ? error.message : "AI request failed.",
    model: client.model,
    hasApiKey: client.hasApiKey
  };
}

async function requestProviderJson(request: ProviderJsonRequest): Promise<string> {
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: createHeaders(request.provider, request.apiKey),
    body: JSON.stringify({
      model: request.model,
      messages: [
        {
          role: "system",
          content: request.systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(request.userPayload)
        }
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: request.schemaName,
          strict: false,
          schema: request.schema
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const providerError = parseProviderError(detail);
    throw new AiProviderRequestError({
      httpStatus: response.status,
      errorCode: providerError.code,
      message: providerError.message || `AI provider request failed with HTTP ${response.status}.`,
      model: request.model,
      hasApiKey: Boolean(request.apiKey)
    });
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new AiProviderRequestError({
      httpStatus: response.status,
      errorCode: "empty_ai_response",
      message: "AI provider returned no message content.",
      model: request.model,
      hasApiKey: Boolean(request.apiKey)
    });
  }

  return content;
}

function parseProviderError(detail: string): { code: string | null; message: string } {
  if (!detail.trim()) {
    return {
      code: null,
      message: ""
    };
  }

  try {
    const parsed = JSON.parse(detail) as {
      error?: {
        code?: unknown;
        message?: unknown;
        type?: unknown;
      };
    };

    const error = parsed.error;
    const code = typeof error?.code === "string"
      ? error.code
      : typeof error?.type === "string"
        ? error.type
        : null;
    const message = typeof error?.message === "string" ? error.message : detail.slice(0, 500);

    return { code, message };
  } catch {
    return {
      code: null,
      message: detail.slice(0, 500)
    };
  }
}

function createHeaders(provider: AiProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "https://sports-fueling-coach.local";
    headers["X-Title"] = "Sports & Fueling Coach";
  }

  return headers;
}

function isAiProvider(value: string): value is AiProvider {
  return value === "groq" || value === "openai" || value === "openrouter";
}
