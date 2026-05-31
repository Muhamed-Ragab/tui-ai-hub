import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export const CONFIG_DIR = join(homedir(), ".config", "tui-ai-hub");
export const CONFIG_PATH = join(CONFIG_DIR, ".env");

const REQUIRED_KEYS = ["GEMINI_API_KEY", "NEWS_API_KEY"] as const;

export function getMissingKeys(): string[] {
  return REQUIRED_KEYS.filter((key) => !process.env[key]);
}

export async function loadConfigFile(): Promise<void> {
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export async function writeConfigFile(keys: Record<string, string>): Promise<void> {
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
