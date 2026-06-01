import { Activity, useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { KEYS } from "@/constants/keys";
import { type FocusZone, CHARS } from "@/constants/ui";
import { any, key, matchKey } from "@/lib/keyboard";
import { colors } from "@/theme";
import { settingsService, type SettingsKey } from "./settings-service";

type Mode = "list" | "edit";

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `****…${value.slice(-4)}`;
}

interface SettingsScreenProps {
  focusZone: FocusZone;
}

export function SettingsScreen({ focusZone }: SettingsScreenProps) {
  const [keys, setKeys] = useState<SettingsKey[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editValue, setEditValue] = useState("");
  const [editKey, setEditKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKeys(settingsService.getKeys());
  }, []);

  function showStatus(msg: string) {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatusMessage(msg);
    statusTimer.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimer.current = null;
    }, 2500);
  }

  function handleEdit(key: SettingsKey | undefined) {
    if (!key) return;
    setEditValue(key.currentValue);
    setEditKey((k) => k + 1);
    setMode("edit");
  }

  function handleSave() {
    const key = keys[selectedIndex];
    if (!key) return;
    settingsService.saveKeys({ [key.envKey]: editValue });
    setKeys(settingsService.getKeys());
    setMode("list");
    showStatus(`Saved ${key.name} key`);
  }

  function handleCancel() {
    setMode("list");
    setEditValue("");
  }

  useKeyboard((e) => {
    if (focusZone !== "content") return;

    if (mode === "edit") {
      matchKey(e, [key(KEYS.ESCAPE), handleCancel]);
      return;
    }

    matchKey(
      e,
      [
        any(key(KEYS.NAV_UP), key(KEYS.NAV_DOWN)),
        () => {
          const lastIndex = keys.length - 1;
          if (lastIndex < 0) return;
          setSelectedIndex((prev) => {
            if (e.name === KEYS.NAV_UP) return prev === 0 ? lastIndex : prev - 1;
            return prev === lastIndex ? 0 : prev + 1;
          });
        },
      ],
      [key(KEYS.SELECT), () => handleEdit(keys[selectedIndex])],
    );
  });

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%", gap: 1 }}>
      <text fg={colors.accent}><strong>Settings</strong></text>

      <Activity mode={statusMessage ? "visible" : "hidden"}>
        <text fg={colors.green}>{statusMessage}</text>
      </Activity>

      <box style={{ flexDirection: "column", gap: 0, marginTop: 1 }}>
        <text fg={colors.muted}>API Keys</text>
        <text fg={colors.muted}>{CHARS.SEPARATOR.repeat(40)}</text>
      </box>

      <box style={{ flexDirection: "column", gap: 0 }}>
        {keys.map((key, i) => {
          const isSelected = selectedIndex === i;
          const itemFg = isSelected ? colors.accent : colors.fg;
          const prefix = isSelected ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX;
          const valueDisplay = key.isSet ? maskValue(key.currentValue) : "not set";
          const valueFg = key.isSet ? colors.fg : colors.muted;

          return (
            <box key={key.envKey} style={{ flexDirection: "column", height: 2 }}>
              <text fg={itemFg}>{prefix}{key.name}</text>
              <text fg={valueFg} style={{ paddingLeft: 2 }}>Key: {valueDisplay}</text>
            </box>
          );
        })}
      </box>

      <box style={{ flexDirection: "column", gap: 1, marginTop: 1 }}>
        <Activity mode={mode === "edit" ? "visible" : "hidden"}>
          <text fg={colors.accent}>{keys[selectedIndex]?.name ?? ""}</text>
          <text fg={colors.muted}>{keys[selectedIndex]?.hint ?? ""}</text>
        </Activity>

        <box style={{ flexDirection: "row", gap: 1 }}>
          <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
            <input
              key={editKey}
              value={editValue}
              onInput={setEditValue}
              onSubmit={handleSave}
              focused={mode === "edit"}
              placeholder="Enter API key..."
            />
          </box>
        </box>

        <Activity mode={mode === "edit" ? "visible" : "hidden"}>
          <text fg={colors.muted}>Enter: save  |  Esc: cancel</text>
        </Activity>
      </box>

      <Activity mode={mode === "list" ? "visible" : "hidden"}>
        <text fg={colors.muted} style={{ marginTop: 1 }}>
          Up/Down: navigate  |  Enter: edit  |  1-4: switch screens
        </text>
      </Activity>

      <text fg={colors.muted} style={{ marginTop: 1 }}>
        Changes take effect after restart.
      </text>
    </box>
  );
}
