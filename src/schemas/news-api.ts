import { z } from "zod";

const articleSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  source: z.object({ name: z.string() }),
  publishedAt: z.string(),
});

export const newsApiResponseSchema = z.object({
  status: z.literal("ok"),
  articles: z.array(articleSchema),
});

export type NewsApiArticle = z.infer<typeof articleSchema>;
export type NewsApiResponse = z.infer<typeof newsApiResponseSchema>;
