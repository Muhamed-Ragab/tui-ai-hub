import { AppError, type ErrorCode } from "@/errors";
import { DEFAULT_TIMEOUT_MS, MAX_RETRIES, BASE_DELAY_MS, MAX_JITTER_MS } from "@/constants/timing";

export class Fetcher {
  private timeout: number;
  private maxRetries: number;
  private baseDelay: number;

  constructor(opts?: { timeout?: number; maxRetries?: number; baseDelay?: number }) {
    this.timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts?.maxRetries ?? MAX_RETRIES;
    this.baseDelay = opts?.baseDelay ?? BASE_DELAY_MS;
  }

  async fetchText(url: string): Promise<string> {
    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(url, { signal: controller.signal });

          if (!res.ok) {
            throw new AppError(
              `Server returned ${res.status} ${res.statusText}`,
              "NETWORK_ERROR",
              true,
            );
          }

          const text = await res.text();

          if (typeof text !== "string" || text.length === 0) {
            throw new AppError("Page returned empty content", "NETWORK_ERROR", true);
          }

          return text;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        if (err instanceof AppError) {
          lastError = err;
          if (attempt < this.maxRetries && isRetryableCode(err.code)) {
            const delay = this.baseDelay * 2 ** attempt + Math.random() * MAX_JITTER_MS;
            await sleep(delay);
            continue;
          }
          throw err;
        }

        if ((err as Error).name === "AbortError") {
          lastError = new AppError("Request timed out", "NETWORK_ERROR", true);
        } else {
          lastError = new AppError(
            `Failed to fetch: ${(err as Error).message}`,
            "NETWORK_ERROR",
            true,
          );
        }

        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * 2 ** attempt + Math.random() * MAX_JITTER_MS;
          await sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new AppError("Request failed", "NETWORK_ERROR", true);
  }

  async fetchJson<T = unknown>(url: string): Promise<T> {
    const text = await this.fetchText(url);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AppError("Invalid JSON response", "NETWORK_ERROR", false);
    }
  }
}

export const fetcher = new Fetcher();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableCode(code: ErrorCode): boolean {
  if (code === "NETWORK_ERROR") return true;
  return false;
}
