import { AI_PROVIDERS, SIGNUP_URLS, type AiProvider } from "@/constants/api";
import { aiClient } from "@/lib/ai";
import { envConfig } from "@/lib/env-config";

export interface SettingsKey {
  envKey: string;
  name: string;
  url: string;
  hint: string;
  currentValue: string;
  isSet: boolean;
}

export interface ProviderInfo {
  id: AiProvider;
  name: string;
  description: string;
  envKey: string;
  signupUrl: string;
  isConfigured: boolean;
  isActive: boolean;
}

export class SettingsService {
  getKeys(): SettingsKey[] {
    return Object.entries(SIGNUP_URLS).map(([envKey, info]) => ({
      envKey,
      ...info,
      currentValue: envConfig.get(envKey),
      isSet: envConfig.has(envKey),
    }));
  }

  async saveKeys(keys: Record<string, string>): Promise<void> {
    await envConfig.setMultiple(keys);
  }

  getCurrentProvider(): AiProvider {
    const stored = envConfig.get("AI_PROVIDER");
    if (stored === "google" || stored === "groq") return stored;
    return "google";
  }

  getProviders(): ProviderInfo[] {
    const current = this.getCurrentProvider();
    return Object.entries(AI_PROVIDERS).map(([id, cfg]) => ({
      id: id as AiProvider,
      name: cfg.name,
      description: cfg.description,
      envKey: cfg.envKey,
      signupUrl: cfg.signupUrl,
      isConfigured: envConfig.has(cfg.envKey),
      isActive: id === current,
    }));
  }

  isProviderConfigured(): boolean {
    const provider = this.getCurrentProvider();
    const cfg = AI_PROVIDERS[provider];
    return envConfig.has(cfg.envKey);
  }

  async setProvider(provider: AiProvider): Promise<void> {
    await envConfig.set("AI_PROVIDER", provider);
    aiClient.reconfigure(provider);
  }
}

export const settingsService = new SettingsService();
