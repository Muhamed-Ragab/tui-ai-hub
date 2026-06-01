import { Activity } from "react";
import { colors, sidebarWidth } from "@/theme";
import { CHARS, SCREEN_IDS } from "@/constants/ui";
import type { ScreenId } from "@/constants/ui";

type Screen = ScreenId;

interface SidebarProps {
  activeScreen: Screen;
  focusIndex: number;
}

const items: { id: Screen; label: string }[] = [
  { id: SCREEN_IDS[0], label: "Scrape" },
  { id: SCREEN_IDS[1], label: "Chat" },
  { id: SCREEN_IDS[2], label: "News" },
  { id: SCREEN_IDS[3], label: "Settings" },
];

const sidebarContainerStyle = {
  width: sidebarWidth,
  height: "100%" as const,
  flexDirection: "column" as const,
  backgroundColor: colors.sidebar.bg,
  paddingTop: 1,
  paddingBottom: 1,
};

export function Sidebar({ activeScreen, focusIndex }: SidebarProps) {
  return (
    <box style={sidebarContainerStyle}>
      <text fg={colors.sidebar.accent} style={{ paddingLeft: 2 }}>
        <strong>tui-ai</strong>
      </text>
      <text fg={colors.sidebar.muted} style={{ paddingLeft: 2 }}>
        {CHARS.SEPARATOR.repeat(sidebarWidth - 4)}
      </text>

      <box
        style={{
          flexDirection: "column",
          marginTop: 1,
          gap: 0,
        }}
      >
        {items.map((item, i) => {
          const isActive = activeScreen === item.id;
          const isFocused = focusIndex === i;
          const bg = isActive ? colors.sidebar.activeBg : undefined;
          const fg = isActive ? colors.sidebar.fg : colors.sidebar.muted;
          const prefix = isActive ? CHARS.ACTIVE_INDICATOR : CHARS.INACTIVE_INDICATOR;

          return (
            <box
              key={item.id}
              style={{
                backgroundColor: bg,
                paddingLeft: 2,
                paddingRight: 2,
                height: 1,
              }}
            >
              <text fg={fg}>
                {prefix} {item.label}
              </text>
              <Activity mode={isFocused ? "visible" : "hidden"}>
                <text fg={colors.accent} style={{ marginLeft: 1 }}>
                  {CHARS.FOCUS_INDICATOR}
                </text>
              </Activity>
            </box>
          );
        })}
      </box>

      <box style={{ flexGrow: 1 }} />
      <text fg={colors.sidebar.muted} style={{ paddingLeft: 2 }}>
        q: quit
      </text>
    </box>
  );
}
