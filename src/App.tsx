import { useState, startTransition } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { colors } from "@/theme";
import { Sidebar } from "@/components/Sidebar";
import { WebScraperScreen } from "@/features/scraper/WebScraperScreen";
import { ChatScreen } from "@/features/chat/ChatScreen";
import { NewsScreen } from "@/features/news/NewsScreen";
import { KEYS } from "@/constants/keys";
import { SCREEN_IDS, STATUSBAR_HEIGHT, CONTENT_PADDING, type ScreenId, type FocusZone } from "@/constants/ui";
import { key, ctrlKey, any, matchKey } from "@/lib/keyboard";

export type Screen = ScreenId;

const SCREENS = {
  scraper: (fz: FocusZone) => <WebScraperScreen focusZone={fz} />,
  chat: (fz: FocusZone) => <ChatScreen focusZone={fz} />,
  news: (fz: FocusZone) => <NewsScreen focusZone={fz} />,
} as const;

const screens: Screen[] = [...SCREEN_IDS];

export function App() {
  const [screen, setScreen] = useState<Screen>("scraper");
  const [focusZone, setFocusZone] = useState<"sidebar" | "content">("content");
  const [focusIndex, setFocusIndex] = useState(0);
  const renderer = useRenderer();

  useKeyboard((e) => {
    matchKey(
      e,
      [any(key(KEYS.QUIT), ctrlKey(KEYS.CTRL_C)), () => renderer.destroy()],
      [
        key(KEYS.TOGGLE_FOCUS),
        () => setFocusZone((prev) => (prev === "sidebar" ? "content" : "sidebar")),
      ],
      [
        key(KEYS.SCREEN_1),
        () => {
          startTransition(() => setScreen("scraper"));
          setFocusIndex(0);
          setFocusZone("content");
        },
      ],
      [
        key(KEYS.SCREEN_2),
        () => {
          startTransition(() => setScreen("chat"));
          setFocusIndex(1);
          setFocusZone("content");
        },
      ],
      [
        key(KEYS.SCREEN_3),
        () => {
          startTransition(() => setScreen("news"));
          setFocusIndex(2);
          setFocusZone("content");
        },
      ],
    );

    if (focusZone === "sidebar") {
      matchKey(
        e,
        [
          any(key(KEYS.NAV_UP), key(KEYS.NAV_DOWN)),
          () => {
            const lastIndex = SCREEN_IDS.length - 1;
            setFocusIndex((prev) => {
              if (e.name === KEYS.NAV_UP) return prev === 0 ? lastIndex : prev - 1;
              return prev === lastIndex ? 0 : prev + 1;
            });
          },
        ],
        [
          key(KEYS.SELECT),
          () => {
            startTransition(() => setScreen(screens[focusIndex]));
            setFocusZone("content");
          },
        ],
      );
    }
  });

  return (
    <box
      style={{
        flexDirection: "row",
        width: "100%",
        height: "100%",
        backgroundColor: colors.bg,
      }}
    >
      <Sidebar activeScreen={screen} focusIndex={focusIndex} />
      <box
        style={{
          flexGrow: 1,
          height: "100%",
          flexDirection: "column",
          backgroundColor: colors.bg,
        }}
      >
        <box
          style={{
            height: STATUSBAR_HEIGHT,
            flexDirection: "row",
            paddingLeft: CONTENT_PADDING,
            paddingRight: CONTENT_PADDING,
            backgroundColor: colors.surface,
          }}
        >
          <text fg={colors.muted}>
            {focusZone === "sidebar" ? "[Tab: content]" : "[Tab: sidebar]"} | Press 1-3 to switch
          </text>
        </box>

        <box
          style={{
            flexGrow: 1,
            flexDirection: "column",
            padding: CONTENT_PADDING,
          }}
        >
          {SCREENS[screen](focusZone)}
        </box>
      </box>
    </box>
  );
}
