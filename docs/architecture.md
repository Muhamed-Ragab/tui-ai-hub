# tui-ai-hub — Architecture

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Bun | OpenTUI requires Bun (Deno/Node support in-progress) |
| Terminal UI | @opentui/core + @opentui/react | Native TUI, React bindings, flexbox layout |
| UI Framework | React | Familiar component model, hooks for state |
| AI SDK | ai + @ai-sdk/google | Vercel AI SDK: streaming-first, typed, provider-agnostic |
| Validation | zod | Runtime safety; validate all external data at boundaries |
| News API | NewsAPI.org (free) | No auth SDK needed; simple GET + fetch |
| Persistence | bun:sqlite | Built into Bun, zero deps, portable single-file DB |
| Cache | In-memory Map with TTL | Simple write-through cache for scraper + news |
| JSX | @opentui/react (jsxImportSource) | OpenTUI provides lowercase intrinsic elements |

## Architecture Style

**Feature-based organization** with shared infrastructure:

```
src/
├── lib/              # Shared infrastructure
│   ├── ai.ts         # AiClient class + aiClient singleton (Gemini via Vercel AI SDK)
│   ├── cache.ts      # MemoryCache class + cache singleton (TTL-based)
│   ├── fetcher.ts    # Fetcher class + fetcher singleton (retry + timeout + fetchJson)
│   ├── news-api.ts   # NewsApiClient class (composes Fetcher, Zod-validated)
│   └── storage.ts    # ChatStorage class (constructor takes optional dbPath)
├── schemas/          # Shared Zod schemas (url, city, chat message)
├── features/         # One folder per feature
│   ├── scraper/
│   ├── chat/
│   └── news/
├── App.tsx           # Shell: Sidebar + screen router
├── config.ts         # Env config (Zod-validated)
├── errors.ts         # Error types
└── theme.ts          # Colors
```

### Components

```
src/
└── components/
    └── Sidebar.tsx   # Persistent left navigation
```

### Layer Rules

```
┌─────────────────────────┐
│   Presentation (TSX)     │  → OpenTUI components, hooks, screen state
│   App.tsx + Sidebar.tsx  │  → imports service singletons, never calls AI/HTTP directly
│   features/*/Screen.tsx   │
├─────────────────────────┤
│   Service (TS)           │  → Orchestration: validate → cache check → call lib → persist → return
│   features/*/service.ts  │  → owns business logic for that feature
├─────────────────────────┤
│   Infrastructure (TS)    │  → External I/O: Gemini, fetch, NewsAPI, SQLite
│   src/lib/*.ts           │  → pure I/O, no UI, no business logic
├─────────────────────────┤
│   Shared (TS)            │  → Zod schemas, config, errors, theme
│   src/schemas/, config   │  → zero I/O, zero framework imports
└─────────────────────────┘
```

### Dependency Direction

```
Screen → Service → Lib ← Schema / Config / Errors
  ↑                                         ↑
  └──────────── Theme ──────────────────────┘
```

- Screens import services + theme
- Services import lib + schemas
- Lib imports config + errors + schemas
- No cyclic deps. Screens never import lib directly.

## Cache Layer

**File:** `src/lib/cache.ts`

In-memory write-through cache with TTL-based eviction. Single instance exported from module:

```
cache.get(key) → null | data  (auto-evicts expired entries)
cache.set(key, data, ttlMs)
cache.clear()
```

| Feature | Cache key | TTL |
|---------|-----------|-----|
| Web scraper | `scraper:${url}` | 1 hour |
| News search | `news:${query}` | 10 minutes |

Services check cache before network calls. Re-submitting the same URL/query overwrites the cache entry.

## Storage Layer

**File:** `src/lib/storage.ts`

Persistent SQLite via `bun:sqlite`. Auto-creates DB file and runs migrations on first import.

```
tui-ai-hub/
└── data/
    └── chat.db        # Auto-created SQLite database
```

### Schema

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### API

```typescript
class ChatStorage {
  constructor(dbPath?: string)  // defaults to process.cwd() + "/data/chat.db"
  listSessions(): Session[]
  getSession(id: string): Session | null
  createSession(): Session
  updateSessionTitle(id: string, title: string): void
  deleteSession(id: string): void
  listMessages(sessionId: string): Message[]
  addMessage(sessionId: string, role: Role, content: string): Message
}
```

## File Naming Conventions

| Pattern | Example | When |
|---------|---------|------|
| `kebab-case` | `scraper-service.ts`, `news-schemas.ts` | Service, lib, and schema files |
| `PascalCase` | `WebScraperScreen.tsx`, `Sidebar.tsx` | Components/screens (TSX) |
| `PascalCase` | `AiClient`, `Fetcher`, `ScraperService` | Exported classes (lib + services) |
| `camelCase` | `scraperService`, `aiClient`, `fetcher` | Exported singleton instances |
| `camelCase` | `stripHtml()`, `formatMessages()` | Private helper functions |

## Data Flow (per feature)

### Web Scraper

```
UserInput (URL string)
  → Zod.url.safeParse()                    [in service]
  → cache.get(`scraper:${url}`)            [in service]
    → hit: return cached data
    → miss: continue
  → fetcher.fetchText(url)                 [in lib/fetcher — retry + timeout]
  → aiClient.generateReply(prompt)         [in lib/ai]
  → Zod.aiResponse.safeParse()             [in service]
  → cache.set(key, result, 1h)             [in service]
  → DTO to Screen → render markdown
```

### Chat

```
App launch
  → chatService.loadSessions()             [in service → ChatStorage]
  → load latest session
  → screen renders session list or chat

User sends message
  → Zod.chatMessage.safeParse()            [in service]
  → chatService.saveMessage(user, msg)     [in service → ChatStorage]
  → aiClient.streamReply(messages)         [in lib/ai]
    → yield string chunks                  [stream to screen]
  → chatService.saveMessage(assistant, accumulated) [in service → ChatStorage]
  → aiClient.generateReply("title...")     [async: auto-title]
  → chatService.renameSession(id, title)   [in service → ChatStorage]

Session switch (Ctrl+S)
  → chatService.loadSessions()             [in service → ChatStorage]
  → user selects → chatService.loadMessages(id)
  → render messages
```

### News

```
UserInput (city string)
  → Zod.city.safeParse()                   [in service]
  → cache.get(`news:${query}`)             [in service]
    → hit: return cached data
    → miss: continue
  → newsApiClient.fetchArticles(city)      [in lib/news-api — uses Fetcher internally]
  → Zod.newsApiResponse.parse()            [in service]
  → cache.set(key, articles, 10min)        [in service]
  → Return article list DTO

User selects article
  → aiClient.generateReply(prompt)         [in service → lib/ai]
  → Zod.summarySchema.parse()              [in service]
  → Return summary DTO
```

## Layout

The app uses a horizontal flexbox split:

```
<box flexDirection="row" width="100%" height="100%">
  <Sidebar />               <!-- fixed 22-char width -->
  <box flexGrow={1}>        <!-- content area -->
    {activeScreen}
  </box>
</box>
```

Sidebar is always visible. No screen ever hides it.

## Screen Routing

```typescript
type Screen = "scraper" | "chat" | "news"
```

App.tsx owns the `useState<Screen>` and passes a `setScreen` callback to Sidebar and screens. No navigation stack — switching tools instant.

Default screen on launch: `"scraper"`.

## State Management

| Feature | State | Location |
|---------|-------|----------|
| Sidebar | activeScreen, focusIndex | useState in Sidebar |
| Scraper | url, status, result, error | useState in WebScraperScreen |
| Chat | mode, sessions[], activeSessionId, messages[], streaming, input | useState + useRef in ChatScreen |
| News | query, articles[], summary, status | useState in NewsScreen |

Chat state persists to SQLite. Sessions survive app restarts. Scraper and news state are transient (cache is lost on restart).

## Error Strategy

```typescript
class AppError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode,
    readonly recoverable: boolean,
  ) { super(message) }
}

type ErrorCode =
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "AI_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PERSISTENCE_ERROR"
```

Services throw `AppError`. Screens catch in `try/catch` and render error state. No `Result<T,E>` discriminated union.

## Config

Validated at startup via Zod:

```typescript
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  NEWS_API_KEY: z.string().min(1, "NEWS_API_KEY is required"),
})
```

DB path is derived from `process.cwd() + "/data/chat.db"`. Directory auto-created if missing.

App fails fast with clear message if keys missing. No partial startup.
