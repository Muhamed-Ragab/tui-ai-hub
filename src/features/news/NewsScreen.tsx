import { useState, startTransition, useRef, useEffect, Activity } from "react";
import { useKeyboard } from "@opentui/react";
import { ScrollBoxRenderable } from "@opentui/core";
import { colors } from "@/theme";
import { newsService } from "./news-service";
import { toDisplayError } from "@/errors";
import { CHARS, INPUT_AREA_HEIGHT, SUMMARY_PANEL_WIDTH, type FocusZone } from "@/constants/ui";
import { NEWS_DESCRIPTION_TRUNCATE_LENGTH } from "@/constants/timing";
import type { NewsApiArticle } from "@/schemas/news-api";

type Phase =
  | { type: "search" }
  | { type: "loading" }
  | { type: "list" }
  | { type: "summarizing" }
  | { type: "error"; message: string };

interface NewsScreenProps {
  focusZone: FocusZone;
}

export function NewsScreen({ focusZone }: NewsScreenProps) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>({ type: "search" });
  const [articles, setArticles] = useState<NewsApiArticle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [summary, setSummary] = useState<{
    summary: string;
    relevance: string;
  } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryFocus, setSummaryFocus] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState<Set<number>>(new Set());
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);
  const summaryScrollboxRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    scrollboxRef.current?.scrollChildIntoView(`article-${selectedIndex}`);
  }, [selectedIndex]);

  const showList =
    phase.type === "list" ||
    phase.type === "summarizing" ||
    (phase.type === "search" && articles.length > 0);

  useKeyboard((key) => {
    if (phase.type !== "list") return;
    if (focusZone !== "content") return;

    if (summary && summaryFocus) {
      switch (key.name) {
        case "escape":
          setSummary(null);
          setSummaryError(null);
          setSummaryFocus(false);
          return;
      }
      return;
    }

    switch (key.name) {
      case "up":
        setSelectedIndex((prev) => (prev === 0 ? articles.length - 1 : prev - 1));
        return;
      case "down":
        setSelectedIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
        return;
      case "return":
        if (summary || summaryError) {
          setSummary(null);
          setSummaryError(null);
        }
        startTransition(() => setPhase({ type: "summarizing" }));
        setSummaryError(null);
        newsService
          .summarizeArticle(articles[selectedIndex], query)
          .then((result) => {
            setSummary(result);
            setPhase({ type: "list" });
          })
          .catch((err) => {
            setSummaryError(toDisplayError(err));
            setPhase({ type: "list" });
          });
        return;
      case "escape":
        setSummary(null);
        setSummaryError(null);
        return;
      case "space":
        setExpandedDesc((prev) => {
          const next = new Set(prev);
          if (next.has(selectedIndex)) next.delete(selectedIndex);
          else next.add(selectedIndex);
          return next;
        });
        return;
    }
  });

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        gap: 1,
      }}
    >
      <text fg={colors.accent}>
        <strong>News</strong>
      </text>
      <text fg={colors.muted}>Enter a city or country to get the latest news</text>

      <box style={{ flexDirection: "row", gap: 1, height: INPUT_AREA_HEIGHT }}>
        <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
          <input
            placeholder="e.g. London, Japan, New York..."
            value={query}
            onInput={setQuery}
            onSubmit={() => {
              if (!query.trim()) return;
              setQuery("");
              startTransition(() => setPhase({ type: "loading" }));
              newsService
                .searchNews(query)
                .then((result) => {
                  setArticles(result);
                  setSelectedIndex(0);
                  setSummary(null);
                  setSummaryError(null);
                  setExpandedDesc(new Set());
                  setPhase({ type: "list" });
                })
                .catch((err) => {
                  setPhase({ type: "error", message: toDisplayError(err) });
                });
            }}
            focused={phase.type === "search" || phase.type === "loading"}
          />
        </box>
      </box>

      <Activity mode={phase.type === "loading" ? "visible" : "hidden"}>
        <text fg={colors.yellow}>Searching news...</text>
      </Activity>

      <Activity mode={phase.type === "error" ? "visible" : "hidden"}>
        <text fg={colors.red}>{phase.type === "error" ? phase.message : ""}</text>
      </Activity>

      <Activity mode={showList ? "visible" : "hidden"}>
        <box
          style={{
            flexDirection: "row",
            flexGrow: 1,
            gap: 1,
          }}
        >
          <box
            style={{
              flexGrow: 1,
              border: true,
              borderStyle: "rounded",
              borderColor: colors.surfaceAlt,
              padding: 1,
            }}
          >
            <scrollbox ref={scrollboxRef} style={{ width: "100%", height: "100%" }}>
              {articles.map((article, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <box
                    key={i}
                    id={`article-${i}`}
                    style={{
                      flexDirection: "column",
                      backgroundColor: isSelected ? colors.surfaceAlt : undefined,
                      paddingLeft: 1,
                      paddingRight: 1,
                      marginBottom: 1,
                    }}
                  >
                    <text fg={isSelected ? colors.accent : colors.fg}>
                      {isSelected ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX}
                      {article.title}
                    </text>
                    <text fg={colors.muted}>
                      {article.source.name} {CHARS.MIDDLE_DOT}{" "}
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </text>
                    <Activity mode={article.description ? "visible" : "hidden"}>
                      <text fg={colors.muted}>
                        {expandedDesc.has(i)
                          ? article.description
                          : (article.description ?? "").slice(0, NEWS_DESCRIPTION_TRUNCATE_LENGTH)}
                        {!expandedDesc.has(i) && (article.description ?? "").length > NEWS_DESCRIPTION_TRUNCATE_LENGTH
                          ? isSelected
                            ? "... ▶"
                            : "..."
                          : ""}
                      </text>
                    </Activity>
                  </box>
                );
              })}
            </scrollbox>
          </box>

          <Activity
            mode={phase.type === "summarizing" && !summary && !summaryError ? "visible" : "hidden"}
          >
            <box
              style={{
                width: SUMMARY_PANEL_WIDTH,
                border: true,
                borderStyle: "rounded",
                borderColor: colors.surfaceAlt,
                padding: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <text fg={colors.yellow}>Generating summary...</text>
            </box>
          </Activity>

          <Activity mode={summaryError ? "visible" : "hidden"}>
            <box
              style={{
                width: SUMMARY_PANEL_WIDTH,
                border: true,
                borderStyle: "rounded",
                borderColor: colors.red,
                padding: 1,
              }}
            >
              <text fg={colors.red}>{summaryError}</text>
              <box
                onMouseDown={() => {
                  setSummaryError(null);
                }}
              >
                <text fg={colors.accent}>Press Esc to close</text>
              </box>
            </box>
          </Activity>

          <Activity mode={summary ? "visible" : "hidden"}>
            <scrollbox
              ref={summaryScrollboxRef}
              focused={summary && summaryFocus}
              style={{
                width: SUMMARY_PANEL_WIDTH,
                border: true,
                borderStyle: "rounded",
                borderColor: summaryFocus ? colors.accent : colors.surfaceAlt,
                padding: 1,
              }}
            >
              <text fg={colors.green}>
                <strong>Summary</strong>
              </text>
              <text fg={colors.fg}>{summary?.summary ?? ""}</text>
              <text fg={colors.muted}>
                Relevance:{" "}
                <span
                  fg={
                    summary?.relevance === "high"
                      ? colors.green
                      : summary?.relevance === "medium"
                        ? colors.yellow
                        : colors.red
                  }
                >
                  {summary?.relevance ?? ""}
                </span>
              </text>
              <box
                onMouseDown={() => {
                  setSummary(null);
                  setSummaryError(null);
                  setSummaryFocus(false);
                }}
              >
                <text fg={colors.accent}>Esc to close</text>
              </box>
            </scrollbox>
          </Activity>
        </box>
      </Activity>
    </box>
  );
}
