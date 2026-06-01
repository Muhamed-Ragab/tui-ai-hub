import { SIGNUP_URLS } from "@/constants/api";
import { loadConfigFile, writeConfigFile } from "@/lib/env-loader";

export interface SettingsKey {
  envKey: string;
  name: string;
  url: string;
  hint: string;
  currentValue: string;
  isSet: boolean;
}

export class SettingsService {
  getKeys(): SettingsKey[] {
    return Object.entries(SIGNUP_URLS).map(([envKey, info]) => ({
      envKey,
      ...info,
      currentValue: process.env[envKey] ?? "",
      isSet: !!process.env[envKey],
    }));
  }

  async saveKeys(keys: Record<string, string>): Promise<void> {
    await writeConfigFile(keys);
    await loadConfigFile();
    for (const [key, value] of Object.entries(keys)) {
      Bun.env[key] = value;
    }
  }
}

export const settingsService = new SettingsService();
