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

export type AiJsonResult =
  | {
    status: "disabled";
  }
  | {
    status: "configured";
    provider: AiProvider;
    model: string;
    generateJson: (request: AiJsonRequest) => Promise<string>;
  }
  | {
    status: "invalid";
    message: string;
  };
