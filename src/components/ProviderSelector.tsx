import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { AI_PROVIDERS, type AiProvider } from "@/constants/api";
import { KEYS } from "@/constants/keys";
import { CHARS } from "@/constants/ui";
import { any, key, matchKey } from "@/lib/keyboard";
import { colors } from "@/theme";
import { envConfig } from "@/lib/env-config";
import { settingsService } from "@/features/settings/settings-service";

interface ProviderSelectorProps {
  onComplete: () => void;
}

export function ProviderSelector({ onComplete }: ProviderSelectorProps) {
  const providers = settingsService.getProviders();
  const current = settingsService.getCurrentProvider();
  const [selected, setSelected] = useState<AiProvider>(current);
  const [apiKey, setApiKey] = useState(envConfig.get(AI_PROVIDERS[selected].envKey));
  const [saving, setSaving] = useState(false);

  function handleSelect(provider: AiProvider) {
    setSelected(provider);
    const key = envConfig.get(AI_PROVIDERS[provider].envKey);
    setApiKey(key);
  }

  async function handleSave() {
    setSaving(true);
    const cfg = AI_PROVIDERS[selected];
    await settingsService.saveKeys({ [cfg.envKey]: apiKey });
    await settingsService.setProvider(selected);
    setSaving(false);
    onComplete();
  }

  function isConfigured(provider: AiProvider): boolean {
    return envConfig.has(AI_PROVIDERS[provider].envKey);
  }

  useKeyboard((e) => {
    matchKey(
      e,
      [
        any(key(KEYS.NAV_UP), key(KEYS.NAV_DOWN)),
        () => {
          const idx = providers.findIndex((p) => p.id === selected);
          const delta = e.name === KEYS.NAV_UP ? -1 : 1;
          const next = (idx + delta + providers.length) % providers.length;
          handleSelect(providers[next].id);
        },
      ],
    );
  });

  return (
    <box style={{ flexDirection: "column", width: "100%", gap: 1 }}>
      <text fg={colors.accent}><strong>Welcome to tui-ai-hub</strong></text>
      <text fg={colors.muted}>Select an AI provider and enter your API key to get started.</text>

      <box style={{ flexDirection: "column", gap: 0, marginTop: 1 }}>
        {providers.map((p) => {
          const isSel = p.id === selected;
          const configured = isConfigured(p.id);
          const prefix = isSel ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX;
          const indicator = configured ? CHARS.ACTIVE_INDICATOR : CHARS.INACTIVE_INDICATOR;
          const statusFg = configured ? colors.green : colors.red;
          const statusText = configured ? "Configured" : "API key required";

          return (
            <box
              key={p.id}
              style={{ flexDirection: "column", height: 2 }}
              onClick={() => handleSelect(p.id)}
            >
              <text fg={isSel ? colors.accent : colors.fg}>
                {prefix}{indicator} {p.name}
              </text>
              <text fg={statusFg} style={{ paddingLeft: 2 }}>{statusText}</text>
            </box>
          );
        })}
      </box>

      <text fg={colors.muted} style={{ marginTop: 1 }}>
        {AI_PROVIDERS[selected].name} API Key
      </text>
      <text fg={colors.muted}>
        Get one at: {AI_PROVIDERS[selected].signupUrl}
      </text>
      <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
        <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
          <input
            value={apiKey}
            onInput={setApiKey}
            onSubmit={handleSave}
            focused
            placeholder={`Enter ${AI_PROVIDERS[selected].name} API key...`}
          />
        </box>
      </box>

      <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
        <box
          style={{
            border: true,
            borderStyle: "single",
            paddingLeft: 1,
            paddingRight: 1,
          }}
          onClick={handleSave}
        >
          <text fg={apiKey ? colors.green : colors.muted}>
            {saving ? "Saving..." : "Save & Continue"}
          </text>
        </box>
      </box>

      <text fg={colors.muted} style={{ marginTop: 1 }}>
        Up/Down: switch provider  |  Enter: save
      </text>
    </box>
  );
}
