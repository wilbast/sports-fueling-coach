import "server-only";
import type { AiJsonRequest, AiJsonResult, AiProvider } from "@/lib/ai/types";

const providerConfigs: Record<AiProvider, {
  apiKeyEnv: string;
  endpoint: string;
  label: string;
}> = {
  groq: {
    apiKeyEnv: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    label: "Groq"
  },
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/chat/completions",
    label: "OpenAI"
  },
  openrouter: {
    apiKeyEnv: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    label: "OpenRouter"
  }
};

export function resolveAiJsonClient(): AiJsonResult {
  const rawProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (!rawProvider) {
    return { status: "disabled" };
  }

  if (!isAiProvider(rawProvider)) {
    return {
      status: "invalid",
      message: `AI_PROVIDER="${rawProvider}" wird nicht unterstützt. Erlaubt sind: groq, openai, openrouter.`
    };
  }

  const providerConfig = providerConfigs[rawProvider];
  const model = process.env.AI_MODEL?.trim();
  const apiKey = process.env[providerConfig.apiKeyEnv]?.trim();
  const missing = [
    model ? "" : "AI_MODEL",
    apiKey ? "" : providerConfig.apiKeyEnv
  ].filter(Boolean);

  if (missing.length > 0) {
    return {
      status: "invalid",
      message: `${providerConfig.label} ist als AI_PROVIDER gesetzt, aber ${missing.join(" und ")} ${missing.length === 1 ? "fehlt" : "fehlen"}.`
    };
  }

  if (!model || !apiKey) {
    return {
      status: "invalid",
      message: `${providerConfig.label} ist nicht vollständig konfiguriert.`
    };
  }

  const configuredModel = model;
  const configuredApiKey = apiKey;

  return {
    status: "configured",
    provider: rawProvider,
    model: configuredModel,
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
    throw new Error(`AI provider request failed with ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
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
    throw new Error("AI provider returned no message content.");
  }

  return content;
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
