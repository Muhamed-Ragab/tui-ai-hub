# tui-ai-hub

Terminal AI Hub — three AI-powered tools in your terminal: Web Scraper, Chat, and News. Built with [OpenTUI](https://opentui.ai) + React, powered by Gemini or Groq via the Vercel AI SDK.

## Features

- **Web Scraper** — Enter a URL, get an AI-generated summary with key points
- **Chat** — Persistent AI chat sessions with streaming responses (SQLite)
- **News** — Search news articles and get AI-powered summaries
- **Multi-provider** — Switch between Google Gemini and Groq (LLaMA) in-app
- **Settings UI** — Configure API keys and provider from within the terminal
- **Cache** — In-memory cache with disk persistence across sessions

## Install

```sh
bunx tui-ai-hub
```

Or install globally:

```sh
bun install -g tui-ai-hub
tui-ai-hub
```

## Setup

On first launch you'll be prompted to enter your API keys. You can also configure them later from the Settings screen (`4`).

Get keys from:
- [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)
- [Groq Console](https://console.groq.com/keys) (LLaMA — optional alternative)
- [NewsAPI](https://newsapi.org/register)

## Usage

| Key | Action |
|-----|--------|
| `1` / `2` / `3` / `4` | Switch to Scrape / Chat / News / Settings |
| `Tab` | Toggle sidebar focus |
| `↑` / `↓` | Navigate sidebar or lists |
| `q` / `Ctrl+C` | Exit |

### Chat shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` / `Tab` | Toggle session list |
| `Ctrl+N` | New session |
| `Ctrl+D` | Delete session |
| `Ctrl+R` | Rename session |

## Development

```sh
bun install
bun run dev       # watch mode
bun run build     # bundle to dist/
bun run lint      # lint
bun run fmt       # format
```

## Tech

- [OpenTUI](https://opentui.ai) — Terminal UI framework
- [Vercel AI SDK](https://sdk.vercel.ai) — AI streaming & generation
- [Gemini 2.0 Flash](https://ai.google.dev) / [Groq LLaMA](https://groq.com) — LLM
- [bun:sqlite](https://bun.sh/docs/api/sqlite) — Persistent chat storage

## License

MIT
