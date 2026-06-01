import { citySchema } from "@/schemas/city";
import { articleSummarySchema } from "@/schemas/ai-response";
import { NewsApiClient } from "@/lib/news-api";
import { AiClient, aiClient } from "@/lib/ai";
import { fetcher } from "@/lib/fetcher";
import { cache, type MemoryCache } from "@/lib/cache";
import { env } from "@/config";
import { AppError } from "@/errors";
import type { NewsApiArticle } from "@/schemas/news-api";
import { NEWS_CACHE_TTL_MS } from "@/constants/timing";

const SUMMARY_SYSTEM_PROMPT = `You are a news analyst. Given a news article title and description, provide a 4-5 sentence summary and rate its relevance to the search query.`;

export class NewsService {
  constructor(
    private newsApi: NewsApiClient,
    private ai: AiClient,
    private cache: MemoryCache,
  ) {}

  async searchNews(input: string): Promise<NewsApiArticle[]> {
    const parsed = citySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Invalid location",
        "VALIDATION_ERROR",
        true,
      );
    }

    const cacheKey = `news:${parsed.data}`;
    const cached = this.cache.get<NewsApiArticle[]>(cacheKey);
    if (cached) return cached;

    const articles = await this.newsApi.fetchArticles(parsed.data);

    if (articles.length === 0) {
      throw new AppError(`No news found for "${parsed.data}"`, "NOT_FOUND", true);
    }

    this.cache.set(cacheKey, articles, NEWS_CACHE_TTL_MS);
    return articles;
  }

  async summarizeArticle(
    article: NewsApiArticle,
    query: string,
  ): Promise<{ summary: string; relevance: string }> {
    return this.ai.generateStructured(
      articleSummarySchema,
      SUMMARY_SYSTEM_PROMPT,
      `Search query: "${query}"\n\nTitle: ${article.title}\nDescription: ${article.description ?? "No description"}`,
    );
  }
}

export const newsService = new NewsService(
  new NewsApiClient({ apiKey: env.NEWS_API_KEY }, fetcher),
  aiClient,
  cache,
);
