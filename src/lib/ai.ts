import { generateObject, generateText, streamText, type CoreMessage, type LanguageModel } from "ai";
import type { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/config";
import { AppError } from "@/errors";
import { AI_PROVIDERS, type AiProvider } from "@/constants/api";

export class AiClient {
  constructor(private model: LanguageModel) {}

  async generateReply(system: string, prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        system,
        prompt,
      });
      return text;
    } catch (err) {
      throw new AppError(`AI request failed: ${(err as Error).message}`, "AI_ERROR", true);
    }
  }

  async generateStructured<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema,
        system,
        prompt,
      });
      return object;
    } catch (err) {
      throw new AppError(`AI request failed: ${(err as Error).message}`, "AI_ERROR", true);
    }
  }

  async *streamReply(messages: CoreMessage[]): AsyncGenerator<string> {
    try {
      const { textStream } = streamText({
        model: this.model,
        messages,
      });

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (err) {
      throw new AppError(`AI stream failed: ${(err as Error).message}`, "AI_ERROR", true);
    }
  }
}

function createAiModel(provider: AiProvider): LanguageModel {
  switch (provider) {
    case "google": {
      const cfg = AI_PROVIDERS.google;
      const apiKey = env[cfg.envKey];
      if (!apiKey)
        throw new AppError("GEMINI_API_KEY is required for google provider", "CONFIG_ERROR", false);
      const google = createGoogleGenerativeAI({ apiKey });
      return google(cfg.model);
    }
    case "groq": {
      const cfg = AI_PROVIDERS.groq;
      const apiKey = env[cfg.envKey];
      if (!apiKey)
        throw new AppError("GROQ_API_KEY is required for groq provider", "CONFIG_ERROR", false);
      const groq = createOpenAI({
        baseURL: cfg.baseUrl,
        apiKey,
      });
      return groq(cfg.model);
    }
  }
}

export const aiClient = new AiClient(createAiModel(env.AI_PROVIDER));
