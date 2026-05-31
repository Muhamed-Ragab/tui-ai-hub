# tui-ai-hub — Product Requirements

## Overview

A terminal user interface (TUI) application that provides three AI-powered tools in one cohesive terminal experience: a web scraper with AI extraction, an AI chat assistant, and a news search with AI summaries.

Built with OpenTUI + React, powered by Gemini (Vercel AI SDK), and validated with Zod.

## Layout

```
┌──────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────────────────────────┐│
│ │  tui-ai  │  │  ┌─ Web Scraper ───────────┐ ││
│ │          │  │  │                          │ ││
│ │  ● Scrape│  │  │  Enter URL to scrape... │ ││
│ │  ○ Chat  │  │  │                          │ ││
│ │  ○ News  │  │  └──────────────────────────┘ ││
│ │          │  │                              ││
│ │ q: quit  │  │  [Status bar]                ││
│ └──────────┘  └──────────────────────────────┘│
└──────────────────────────────────────────────┘
```

- Sidebar (22 chars wide): always visible on the left, shows active tool with `●` and inactive with `○`
- Content area: switches between the three tools
- No intermediate menu screen — sidebar IS the navigation

## User Flow

```
Terminal start → Web Scraper (default screen)
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    Web Scraper    Chat       News
    (sidebar)    (sidebar)  (sidebar)
          │          │          │
          ▼          ▼          ▼
      Result      Response    Articles
                               │
                               ▼
                            Summary
```

## Screens

### 1. Web Scraper

Extract structured information from any URL using AI.

**Elements:**
- URL input field with placeholder "Enter URL to scrape..."
- Submit button/Enter trigger
- Result area (markdown rendered)
- Status indicator (idle / fetching / extracting / done / error)

**Flow:**
1. User enters URL → Zod validates (`z.string().url()`)
2. Invalid URL → red error message inline
3. Valid URL → show "Fetching page..." status
4. `fetch(url)` returns HTML → show "Extracting with AI..." status
5. `Gemini.generateText(...)` returns structured result
6. Zod validates AI response shape
7. Render result as markdown (title, summary, key points)

**States:**
| State | UI |
|-------|-----|
| idle | Empty input, hint text visible |
| loading: fetching | "Fetching page..." |
| loading: extracting | "Extracting with AI..." |
| success | Markdown result with title and key points |
| error: invalid url | Red "Invalid URL" message |
| error: network | "Failed to fetch URL: [reason]" |
| error: ai | "AI extraction failed: [reason]" |
| error: format | "Unexpected AI response format" |

### 2. Chat

Real-time AI chat with streaming responses and full session management.

**Layout — Two modes:**

**Chat mode (default):**
```
┌──────────────────────────────────────────────────┐
│ [Ctrl+S: sessions]  ──  sessions: "My Chat"     │
│                                                  │
│  User messages → cyan, right                     │
│  AI messages → markdown rendered                 │
│                                                  │
│ [input...]                                       │
└──────────────────────────────────────────────────┘
```

**Session list mode (Ctrl+S / Tab):**
```
┌──────────────────────────────────────────────────┐
│  Ctrl+N: new  Ctrl+D: delete  Enter: load        │
│                                                  │
│  ▶ AI Chat 1              Today 3:15 PM         │
│    Project ideas           Today 2:30 PM         │
│    Bug help                Yesterday 11:20 AM    │
│    (empty history)                              │
│                                                  │
│  Arrow keys navigate, Enter to load              │
└──────────────────────────────────────────────────┘
```

**Elements:**
- Session title bar showing active session name
- Scrollable message area with alternating user/assistant messages
- Input bar at bottom with placeholder "Type a message..."
- Stream indicator when AI is responding
- Session list overlay (toggle with Ctrl+S or Tab)

**Flow:**
1. On launch: load sessions from SQLite, open most recent
2. If no sessions exist: auto-create one with "Untitled" title
3. User types message → Zod validates → stored to SQLite
4. Stream AI response → chunks displayed in real time → full response stored
5. After first AI response: auto-generate session title via Gemini (async, non-blocking)
6. Ctrl+S/Tab toggles session list: navigate with ↑/↓, Enter to load, Ctrl+N for new, Ctrl+D to delete
7. All messages persist to SQLite — survive app restart

**Message format:**
- User messages: cyan color with "You:" prefix
- AI messages: rendered as markdown

**Session auto-titling:**
- After first user+AI exchange, call Gemini with: "Generate a 3-5 word title for this conversation"
- Save title to DB asynchronously
- Display "(Untitled)" until title arrives
- On error: keep "Untitled"

**States:**
| State | UI |
|-------|-----|
| loading sessions | "Loading sessions..." |
| empty (no messages) | Welcome message, "Type something to start" |
| chat mode | Messages visible, input focused |
| session list mode | Overlay with sessions, chat dimmed behind |
| streaming | Growing AI response text |
| error: validation | Message rejected, inline error |
| error: stream | "Stream failed: [reason]" |
| error: persistence | "Failed to save message" (non-blocking) |

### 3. News

Search news by city/country and get AI-summarized insights.

**Elements:**
- Location input with placeholder "Enter city or country..."
- Article list (title + source + description preview)
- Active article summary panel (shows when article selected)
- Navigation hints

**Flow:**
1. User enters location → Zod validates
2. "Searching news..." status
3. NewsAPI returns articles → Zod validates response
4. Display article list (scrollable)
5. User navigates list with `↑`/`↓`, presses `Enter` on article
6. "Generating summary..." status
7. AI summarizes article → Zod validates summary shape
8. Summary panel opens (right side or overlay showing title, summary, relevance)

**States:**
| State | UI |
|-------|-----|
| idle | Empty input |
| loading: search | "Searching news..." |
| loading: summarize | "Generating AI summary..." |
| success: list | Article list rendered |
| success: summary | Summary panel visible for selected article |
| empty: no results | "No news found for [query]" |
| error: network | "Failed to fetch news: [reason]" |
| error: api limit | "NewsAPI rate limit reached. Try later." |
| error: summary | "Failed to generate summary" |

## Cross-Cutting Requirements

### Keyboard Navigation
- `↑`/`↓` — navigate sidebar items / navigate session list
- `Enter` — switch to selected sidebar tool / load selected session
- `1` / `2` / `3` — direct jump to Scrape/Chat/News
- `Tab` — shift focus between sidebar and content area / toggle session list in Chat
- `Ctrl+S` — toggle session list in Chat
- `Ctrl+N` — new session in Chat
- `Ctrl+D` — delete selected session in Chat
- `Ctrl+R` — rename selected session in Chat
- `q` / `Ctrl+C` — exit the app

### Sidebar
- Fixed 22-char width, full height
- Header: app name "tui-ai" at top
- Active item: `●` prefix with accent background
- Inactive item: `○` prefix
- Footer: "q: quit" hint
- No scroll needed (3 items fit)

### Validation (Zod)
- Every user input validated before processing
- Every API response validated before rendering
- Every AI output validated before display
- Invalid data → user-friendly error, never crash

### Error Handling
- No uncaught exceptions reach the UI
- Every error has a displayable message
- Network timeouts (10s default)
- AI errors shown inline, not as crashes

### Theme
- Dracula/Nord hybrid dark palette
- Consistent accent color for interactive elements
- Muted colors for secondary text
- Red for errors, green for success, yellow for warnings

### Caching
- Web scraper: 1-hour TTL per URL (in-memory, lost on restart)
- News API: 10-minute TTL per search query (in-memory, lost on restart)
- Re-submitting same URL/query overwrites cache entry (force refresh)

### Persistence
- Chat messages and sessions: SQLite via `bun:sqlite`
- DB file: `data/chat.db` next to the app
- Auto-creates DB and directory on first launch
- Sessions survive app restarts
- No migrations needed (schema created once)

### Performance
- Single AI provider — no provider switching needed
- Cache reduces duplicate network calls
- SQLite reads are synchronous and instant for small datasets
