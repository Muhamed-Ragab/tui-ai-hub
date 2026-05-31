export const CHARS = {
  SEPARATOR: "\u2500",
  ACTIVE_INDICATOR: "\u25CF",
  INACTIVE_INDICATOR: "\u25CB",
  FOCUS_INDICATOR: "\u25B6",
  MIDDLE_DOT: "\u00B7",
  SELECTED_PREFIX: "\u25B6 ",
  UNSELECTED_PREFIX: "  ",
} as const;

export const STATUSBAR_HEIGHT = 1;
export const CONTENT_PADDING = 1;
export const INPUT_AREA_HEIGHT = 3;
export const SUMMARY_PANEL_WIDTH = 40;

export const SCREEN_IDS = ["scraper", "chat", "news"] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

export const FOCUS_ZONES = ["sidebar", "content"] as const;
export type FocusZone = (typeof FOCUS_ZONES)[number];
