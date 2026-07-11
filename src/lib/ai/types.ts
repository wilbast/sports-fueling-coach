export type AiProvider = "groq" | "openai" | "openrouter";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiJsonRequest = {
  systemPrompt: string;
  userPayload: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
};

export type AiDebugInfo = {
  httpStatus: number | null;
  errorCode: string | null;
  message: string;
  model: string | null;
  hasApiKey: boolean;
};

export type AiJsonResult =
  | {
    status: "disabled";
  }
  | {
    status: "configured";
    provider: AiProvider;
    model: string;
    hasApiKey: boolean;
    generateJson: (request: AiJsonRequest) => Promise<string>;
    streamJson: (request: AiJsonRequest) => AsyncIterable<string>;
  }
  | {
    status: "invalid";
    message: string;
    debug: AiDebugInfo;
  };
