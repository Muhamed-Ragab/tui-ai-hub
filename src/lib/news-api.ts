import { AppError } from "@/errors";
import { newsApiResponseSchema, type NewsApiArticle } from "@/schemas/news-api";
import { Fetcher } from "@/lib/fetcher";
import {
  NEWSAPI_BASE_URL,
  NEWSAPI_DEFAULT_LANGUAGE,
  NEWSAPI_PAGE_SIZE,
  NEWSAPI_RATE_LIMIT_STATUS,
} from "@/constants/api";

export class NewsApiClient {
  private baseUrl: string;
  private apiKey: string;
  private fetcher: Fetcher;

  constructor(config: { apiKey: string; baseUrl?: string }, fetcher: Fetcher) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? NEWSAPI_BASE_URL;
    this.fetcher = fetcher;
  }

  async fetchArticles(query: string): Promise<NewsApiArticle[]> {
    const url = `${this.baseUrl}/everything?q=${encodeURIComponent(query)}&language=${NEWSAPI_DEFAULT_LANGUAGE}&pageSize=${NEWSAPI_PAGE_SIZE}&apiKey=${this.apiKey}`;

    let json: unknown;
    try {
      json = await this.fetcher.fetchJson(url);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.message.includes(NEWSAPI_RATE_LIMIT_STATUS)) {
          throw new AppError("NewsAPI rate limit reached. Try again later.", "RATE_LIMITED", true);
        }
        throw err;
      }
      throw new AppError(`Failed to fetch news: ${(err as Error).message}`, "NETWORK_ERROR", true);
    }

    const parsed = newsApiResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Unexpected response format from NewsAPI", "NETWORK_ERROR", false);
    }

    return parsed.data.articles;
  }
}
