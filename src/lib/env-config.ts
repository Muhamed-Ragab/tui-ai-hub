import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const CONFIG_DIR = join(homedir(), ".config", "tui-ai-hub");
const CONFIG_PATH = join(CONFIG_DIR, ".env");

export class EnvConfig {
  async load(): Promise<void> {
    if (!existsSync(CONFIG_PATH)) return;

    const text = await Bun.file(CONFIG_PATH).text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      Bun.env[key] = value;
      process.env[key] = value;
    }
  }

  get(key: string): string {
    return Bun.env[key] ?? process.env[key] ?? "";
  }

  has(key: string): boolean {
    return this.get(key).length > 0;
  }

  async set(key: string, value: string): Promise<void> {
    Bun.env[key] = value;
    process.env[key] = value;
    await this.#persist({ [key]: value });
  }

  async setMultiple(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      Bun.env[key] = value;
      process.env[key] = value;
    }
    await this.#persist(entries);
  }

  async #persist(keys: Record<string, string>): Promise<void> {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const existing: Record<string, string> = {};
    if (existsSync(CONFIG_PATH)) {
      const text = await Bun.file(CONFIG_PATH).text();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        existing[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }
    const merged = { ...existing, ...keys };
    const content = Object.entries(merged)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    await Bun.write(CONFIG_PATH, content);
  }
}

export const envConfig = new EnvConfig();
