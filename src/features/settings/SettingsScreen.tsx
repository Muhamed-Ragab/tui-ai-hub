import { Activity, useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { KEYS } from "@/constants/keys";
import { AI_PROVIDERS } from "@/constants/api";
import { type FocusZone, CHARS } from "@/constants/ui";
import { any, key, matchKey } from "@/lib/keyboard";
import { colors } from "@/theme";
import { envConfig } from "@/lib/env-config";
import { settingsService, type ProviderInfo } from "./settings-service";

type ItemType = "provider" | "ai-key" | "news-key";
type EditMode = "ai-key" | "news-key";

interface SettingsScreenProps {
  focusZone: FocusZone;
}

export function SettingsScreen({ focusZone }: SettingsScreenProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<EditMode | null>(null);
  const [editValue, setEditValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadData() {
    setProviders(settingsService.getProviders());
  }

  useEffect(loadData, []);

  const items: { type: ItemType; providerId?: string; label: string }[] = [
    ...providers.map((p) => ({ type: "provider" as const, providerId: p.id, label: p.name })),
    { type: "ai-key" as const, label: "API Key" },
    { type: "news-key" as const, label: "NewsAPI Key" },
  ];

  const currentItem = items[selectedIndex];

  function showStatus(msg: string) {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatusMessage(msg);
    statusTimer.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimer.current = null;
    }, 2500);
  }

  async function handleSelect() {
    if (!currentItem) return;
    if (currentItem.type === "provider") {
      await settingsService.setProvider(currentItem.providerId!);
      loadData();
      showStatus(`Switched to ${currentItem.label}`);
    } else {
      setEditValue(envConfig.get(currentItem.type === "ai-key" ? AI_PROVIDERS[settingsService.getCurrentProvider()].envKey : "NEWS_API_KEY"));
      setMode(currentItem.type);
    }
  }

  async function handleSave() {
    if (!mode) return;
    const key = mode === "ai-key" ? AI_PROVIDERS[settingsService.getCurrentProvider()].envKey : "NEWS_API_KEY";
    await settingsService.saveKeys({ [key]: editValue });
    if (mode === "ai-key") {
      const provider = settingsService.getCurrentProvider();
      const cfg = AI_PROVIDERS[provider];
      if (key === cfg.envKey) {
        await settingsService.setProvider(provider);
      }
    }
    loadData();
    setMode(null);
    showStatus(`Saved ${mode === "ai-key" ? "API" : "NewsAPI"} key`);
  }

  function handleCancel() {
    setMode(null);
    setEditValue("");
  }

  useKeyboard((e) => {
    if (focusZone !== "content") return;

    if (mode) {
      matchKey(e, [key(KEYS.ESCAPE), handleCancel]);
      return;
    }

    matchKey(
      e,
      [
        any(key(KEYS.NAV_UP), key(KEYS.NAV_DOWN)),
        () => {
          const lastIndex = items.length - 1;
          if (lastIndex < 0) return;
          setSelectedIndex((prev) => {
            if (e.name === KEYS.NAV_UP) return prev === 0 ? lastIndex : prev - 1;
            return prev === lastIndex ? 0 : prev + 1;
          });
        },
      ],
      [key(KEYS.SELECT), handleSelect],
    );
  });

  const activeProvider = providers.find((p) => p.isActive);

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%", gap: 1 }}>
      <text fg={colors.accent}><strong>Settings</strong></text>

      <Activity mode={statusMessage ? "visible" : "hidden"}>
        <text fg={colors.green}>{statusMessage}</text>
      </Activity>

      <box style={{ flexDirection: "column", gap: 0, marginTop: 1 }}>
        <text fg={colors.muted}>AI Provider</text>
        <text fg={colors.muted}>{CHARS.SEPARATOR.repeat(40)}</text>
      </box>

      <box style={{ flexDirection: "column", gap: 0 }}>
        {providers.map((p, i) => {
          const isSelected = selectedIndex === i;
          const itemFg = isSelected ? colors.accent : colors.fg;
          const prefix = isSelected ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX;
          const indicator = p.isActive ? CHARS.ACTIVE_INDICATOR : CHARS.INACTIVE_INDICATOR;
          const statusFg = p.isConfigured ? colors.green : colors.red;
          const statusText = p.isConfigured ? "active" : "no key";

          return (
            <box key={p.id} style={{ flexDirection: "column", height: 2 }}>
              <text fg={itemFg}>{prefix}{indicator} {p.name}</text>
              <text fg={statusFg} style={{ paddingLeft: 2 }}>{statusText}</text>
            </box>
          );
        })}
      </box>

      <box style={{ flexDirection: "column", gap: 0, marginTop: 1 }}>
        <text fg={colors.muted}>API Keys</text>
        <text fg={colors.muted}>{CHARS.SEPARATOR.repeat(40)}</text>
      </box>

      <Activity mode={mode !== "ai-key" ? "visible" : "hidden"}>
        {["ai-key", "news-key"].map((t) => {
          const itemType = t as ItemType;
          const idx = providers.length + (itemType === "ai-key" ? 0 : 1);
          const isSelected = selectedIndex === idx;
          const itemFg = isSelected ? colors.accent : colors.fg;
          const prefix = isSelected ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX;
          const envKey = itemType === "ai-key" ? AI_PROVIDERS[settingsService.getCurrentProvider()].envKey : "NEWS_API_KEY";
          const isSet = envConfig.has(envKey);
          const name = itemType === "ai-key" ? `${activeProvider?.name ?? ""} API Key` : "NewsAPI Key";

          return (
            <box key={itemType} style={{ flexDirection: "column", height: 2 }}>
              <text fg={itemFg}>{prefix}{name}</text>
              <text fg={isSet ? colors.fg : colors.muted} style={{ paddingLeft: 2 }}>
                {isSet ? "Configured" : "Not set"}
              </text>
            </box>
          );
        })}
      </Activity>

      <Activity mode={mode === "ai-key" ? "visible" : "hidden"}>
        <text fg={colors.muted} style={{ marginTop: 1 }}>
          {activeProvider?.name ?? ""} API Key
        </text>
        <text fg={colors.muted}>
          {AI_PROVIDERS[settingsService.getCurrentProvider()]?.signupUrl ?? ""}
        </text>
        <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
          <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
            <input
              value={editValue}
              onInput={setEditValue}
              onSubmit={handleSave}
              focused
              placeholder={`Enter ${activeProvider?.name ?? ""} API key...`}
            />
          </box>
        </box>
        <text fg={colors.muted}>Enter: save  |  Esc: cancel</text>
      </Activity>

      <Activity mode={mode === "news-key" ? "visible" : "hidden"}>
        <text fg={colors.muted} style={{ marginTop: 1 }}>NewsAPI Key</text>
        <text fg={colors.muted}>https://newsapi.org/register</text>
        <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
          <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
            <input
              value={editValue}
              onInput={setEditValue}
              onSubmit={handleSave}
              focused
              placeholder="Enter NewsAPI key..."
            />
          </box>
        </box>
        <text fg={colors.muted}>Enter: save  |  Esc: cancel</text>
      </Activity>

      <Activity mode={!mode ? "visible" : "hidden"}>
        <text fg={colors.muted} style={{ marginTop: 1 }}>
          Up/Down: navigate  |  Enter: switch provider / edit key
        </text>
      </Activity>
    </box>
  );
}
