import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private persistencePath?: string;

  constructor(persistencePath?: string) {
    if (persistencePath) {
      this.persistencePath = persistencePath;
      this.load();
      this.sweep();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }

  save(): void {
    if (!this.persistencePath) return;
    const dir = dirname(this.persistencePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const now = Date.now();
    const entries: [string, { data: unknown; expiresAt: number }][] = [];
    for (const [key, entry] of this.store) {
      if (now <= entry.expiresAt) {
        entries.push([key, entry]);
      }
    }
    writeFileSync(this.persistencePath, JSON.stringify(entries), "utf-8");
  }

  private load(): void {
    if (!existsSync(this.persistencePath!)) return;
    try {
      const raw = readFileSync(this.persistencePath!, "utf-8");
      const entries = JSON.parse(raw) as [string, CacheEntry<unknown>][];
      const now = Date.now();
      for (const [key, entry] of entries) {
        if (now <= entry.expiresAt) {
          this.store.set(key, entry);
        }
      }
    } catch {
      // Corrupt file — start fresh
    }
  }
}

export const cache = new MemoryCache(join(process.cwd(), "data", "cache.json"));
