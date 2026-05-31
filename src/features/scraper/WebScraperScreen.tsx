import { useState, Activity } from "react";
import { useKeyboard } from "@opentui/react";
import { colors } from "@/theme";
import { getSyntaxStyle } from "@/lib/syntax";
import { scraperService } from "./scraper-service";
import { toDisplayError } from "@/errors";
import { INPUT_AREA_HEIGHT } from "@/constants/ui";
import type { ScrapeResult } from "@/schemas/ai-response";

type Status =
  | { type: "idle" }
  | { type: "loading"; stage: "fetching" | "extracting" }
  | { type: "success"; result: ScrapeResult }
  | { type: "error"; message: string };

export function WebScraperScreen() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useKeyboard((key) => {
    if (key.name === "escape" && status.type === "success") {
      setUrl("");
      setStatus({ type: "idle" });
    }
  });

  const loadingLabel =
    status.type === "loading"
      ? status.stage === "fetching"
        ? "Fetching page..."
        : "Extracting with AI..."
        : "";

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
        <strong>Web Scraper</strong>
      </text>
      <text fg={colors.muted}>Enter a URL to extract structured information with AI</text>

      <box style={{ flexDirection: "row", gap: 1, height: INPUT_AREA_HEIGHT }}>
        <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
          <input
            placeholder="https://example.com"
            value={url}
            onInput={setUrl}
            onSubmit={() => {
              setUrl("");
              setStatus({ type: "loading", stage: "fetching" });
              scraperService
                .scrapeUrl(url)
                .then((result) => setStatus({ type: "success", result }))
                .catch((err) => setStatus({ type: "error", message: toDisplayError(err) }));
            }}
            focused={status.type !== "loading"}
          />
        </box>
      </box>

      <Activity mode={status.type === "loading" ? "visible" : "hidden"}>
        <text fg={colors.yellow}>{loadingLabel}</text>
      </Activity>

      <Activity mode={status.type === "error" ? "visible" : "hidden"}>
        <text fg={colors.red}>{status.type === "error" ? status.message : ""}</text>
      </Activity>

      <Activity mode={status.type === "success" ? "visible" : "hidden"}>
        <box
          style={{
            flexDirection: "column",
            gap: 1,
            flexGrow: 1,
          }}
        >
          <text fg={colors.green}>Done. Results:</text>
          <box
            style={{
              flexGrow: 1,
              border: true,
              borderStyle: "rounded",
              borderColor: colors.surfaceAlt,
              padding: 1,
            }}
          >
            <markdown content={status.type === "success" ? formatResult(status.result) : ""} syntaxStyle={getSyntaxStyle()} />
          </box>
        </box>
      </Activity>
    </box>
  );
}

function formatResult(result: ScrapeResult): string {
  const points = result.keyPoints.map((p) => `- ${p}`).join("\n");
  return `### ${result.title}\n\n${result.summary}\n\n${points}`;
}
