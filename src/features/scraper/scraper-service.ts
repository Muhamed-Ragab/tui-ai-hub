import { urlSchema } from "@/schemas/url";
import { scrapeResultSchema, type ScrapeResult } from "@/schemas/ai-response";
import { Fetcher, fetcher } from "@/lib/fetcher";
import { AiClient, aiClient } from "@/lib/ai";
import { cache, type MemoryCache } from "@/lib/cache";
import { AppError } from "@/errors";
import {
  SCRAPE_CACHE_TTL_MS,
  SCRAPE_MAX_HTML_LENGTH,
  SCRAPE_MIN_CONTENT_LENGTH,
} from "@/constants/timing";
import {
  REGEX_STRIP_SCRIPTS,
  REGEX_STRIP_STYLES,
  REGEX_STRIP_TAGS,
  REGEX_STRIP_ENTITIES,
  REGEX_COLLAPSE_WHITESPACE,
  REGEX_EXTRACT_JSON,
} from "@/constants/regex";

const SCRAPE_SYSTEM_PROMPT = `You are a web content analyzer. Given the raw HTML text of a webpage, extract the key information and return it as a JSON object with exactly these fields:
- title: the page title
- summary: a 2-3 sentence summary of what the page is about
- keyPoints: an array of 3-6 key points from the content`;

function stripHtml(html: string): string {
  return html
    .replace(REGEX_STRIP_SCRIPTS, "")
    .replace(REGEX_STRIP_STYLES, "")
    .replace(REGEX_STRIP_TAGS, "")
    .replace(REGEX_STRIP_ENTITIES, " ")
    .replace(REGEX_COLLAPSE_WHITESPACE, " ")
    .trim()
    .slice(0, SCRAPE_MAX_HTML_LENGTH);
}

export class ScraperService {
  constructor(
    private fetcher: Fetcher,
    private ai: AiClient,
    private cache: MemoryCache,
  ) {}

  async scrapeUrl(input: string): Promise<ScrapeResult> {
    const parsed = urlSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        "Invalid URL. Enter a full URL like https://example.com",
        "VALIDATION_ERROR",
        true,
      );
    }

    const cacheKey = `scraper:${parsed.data}`;
    const cached = this.cache.get<ScrapeResult>(cacheKey);
    if (cached) return cached;

    const rawHtml = await this.fetcher.fetchText(parsed.data);
    const cleanText = stripHtml(rawHtml);

    if (cleanText.length < SCRAPE_MIN_CONTENT_LENGTH) {
      throw new AppError("Page content is too short to analyze", "NETWORK_ERROR", true);
    }

    const text = await this.ai.generateReply(
      SCRAPE_SYSTEM_PROMPT,
      `Extract information from this webpage content:\n\n${cleanText}`,
    );

    const jsonMatch = text.match(REGEX_EXTRACT_JSON);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;

    let result: unknown;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      const fallback: ScrapeResult = {
        title: "Extracted Content",
        summary: text,
        keyPoints: [],
      };
      this.cache.set(cacheKey, fallback, SCRAPE_CACHE_TTL_MS);
      return fallback;
    }

    const validated = scrapeResultSchema.safeParse(result);
    if (!validated.success) {
      const fallback: ScrapeResult = {
        title: "Extracted Content",
        summary: text,
        keyPoints: [],
      };
      this.cache.set(cacheKey, fallback, SCRAPE_CACHE_TTL_MS);
      return fallback;
    }

    this.cache.set(cacheKey, validated.data, SCRAPE_CACHE_TTL_MS);
    return validated.data;
  }
}

export const scraperService = new ScraperService(fetcher, aiClient, cache);
