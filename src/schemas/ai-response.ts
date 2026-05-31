import { z } from "zod";

export const scrapeResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

export type ScrapeResult = z.infer<typeof scrapeResultSchema>;

export const articleSummarySchema = z.object({
  summary: z.string(),
  relevance: z.string(),
});

export type ArticleSummary = z.infer<typeof articleSummarySchema>;
