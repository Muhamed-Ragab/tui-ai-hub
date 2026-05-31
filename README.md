# tui-ai-hub

Terminal AI Hub — three AI-powered tools in your terminal: Web Scraper, Chat, and News. Built with [OpenTUI](https://opentui.ai) + React, powered by Gemini via the Vercel AI SDK.

## Features

- **Web Scraper** — Enter a URL, get an AI-generated summary with key points
- **Chat** — Persistent AI chat sessions with streaming responses
- **News** — Search news articles and get AI-powered summaries

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

Create a `.env` file in the directory you run the app from:

```env
GEMINI_API_KEY=your_gemini_api_key
NEWS_API_KEY=your_newsapi_key
```

Get keys from:
- [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)
- [NewsAPI](https://newsapi.org/register)

## Usage

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Switch to Scrape / Chat / News |
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
- [Gemini 2.0 Flash](https://ai.google.dev) — LLM
- [bun:sqlite](https://bun.sh/docs/api/sqlite) — Persistent chat storage

## License

MIT
