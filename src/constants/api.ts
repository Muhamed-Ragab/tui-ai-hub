export const AI_MODEL = "gemini-2.0-flash";
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export const AI_PROVIDERS = {
  google: {
    envKey: "GEMINI_API_KEY" as const,
    model: AI_MODEL,
  },
  groq: {
    envKey: "GROQ_API_KEY" as const,
    model: GROQ_MODEL,
    baseUrl: "https://api.groq.com/openai/v1",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const NEWSAPI_BASE_URL = "https://newsapi.org/v2";
export const NEWSAPI_DEFAULT_LANGUAGE = "en";
export const NEWSAPI_PAGE_SIZE = 10;
export const NEWSAPI_RATE_LIMIT_STATUS = "426";
