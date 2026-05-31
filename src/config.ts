import { z } from "zod";
import { AppError } from "@/errors";

const envSchema = z.object({
  AI_PROVIDER: z.enum(["google", "groq"]).optional().default("google"),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().min(1, "NEWS_API_KEY is required"),
});

function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(Bun.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new AppError(
      `Missing environment variables: ${missing}\nCopy .env file and add your API keys.`,
      "CONFIG_ERROR",
      false,
    );
  }
  return result.data;
}

export const env = loadEnv();
