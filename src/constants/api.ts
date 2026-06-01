export const AI_MODEL = "gemini-2.0-flash";
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export const AI_PROVIDERS = {
  google: {
    envKey: "GEMINI_API_KEY" as const,
    model: AI_MODEL,
    name: "Google Gemini",
    description: "Google's flagship multimodal model (Gemini 2.0 Flash)",
    signupUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    envKey: "GROQ_API_KEY" as const,
    model: GROQ_MODEL,
    name: "Groq (LLaMA)",
    description: "Fast inference via Groq LPU hardware (LLaMA 3.3 70B)",
    signupUrl: "https://console.groq.com/keys",
    baseUrl: "https://api.groq.com/openai/v1",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const NEWSAPI_BASE_URL = "https://newsapi.org/v2";
export const NEWSAPI_DEFAULT_LANGUAGE = "en";
export const NEWSAPI_PAGE_SIZE = 10;
export const NEWSAPI_RATE_LIMIT_STATUS = "426";

export const SIGNUP_URLS: Record<string, { name: string; url: string; hint: string }> = {
  GEMINI_API_KEY: {
    name: "Google Gemini",
    url: "https://aistudio.google.com/apikey",
    hint: "Required for AI features (scraper, chat, news summaries)",
  },
  GROQ_API_KEY: {
    name: "Groq (LLaMA)",
    url: "https://console.groq.com/keys",
    hint: "Required when Groq is the active AI provider",
  },
  NEWS_API_KEY: {
    name: "NewsAPI",
    url: "https://newsapi.org/register",
    hint: "Required for the News tool",
  },
};
