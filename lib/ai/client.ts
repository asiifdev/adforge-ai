import OpenAI from "openai";

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Points at any OpenAI-compatible endpoint (OpenRouter, Groq, Together,
      // DeepSeek, local Ollama/vLLM, Azure OpenAI, etc). Defaults to OpenAI itself.
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}
