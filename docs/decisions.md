# Architecture Decision Records

## ADR-001: Feature-based over DDD or Flat Structure

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Three organizations were considered for the project: full Domain-Driven Design (ports/adapters, aggregates, value objects), flat screens/, and feature-based folders.

### Decision

Use **feature-based folders** with shared `lib/` and `schemas/` for cross-cutting concerns.

### Rationale

- **Not DDD**: 3 screens, 1 AI provider, 1 news API, ~800 lines of app logic. Port interfaces (each with exactly 1 implementation), base classes (ValueObject, Entity), and Result<T,E> discriminated unions add ceremony without proportional benefit.
- **Not flat**: screens/ alone doesn't distinguish service/schema files from component files, leading to awkward naming like `web-scraper-screen-service.ts`.
- **Feature-based**: Co-locates related files (screen, service, feature-specific schemas). Shared logic goes in `lib/` or `schemas/` only when ≥2 features use it. Clear boundary to inline or extract.

### Consequences

- Each feature is independently deletable
- Shared code must prove its sharedness (≥2 consumers) before leaving the feature folder
- Simple refactor to DDD later if the app grows: promote service files to use cases, add port interfaces at that time

---

## ADR-002: Try/Catch over Result<T,E>

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Functional Result types (Rust-style `Ok`/`Err` discriminated unions) are common in DDD. They force callers to handle errors explicitly. But they also introduce match/pattern boilerplate.

### Decision

Use **typed exceptions (`AppError`)** with `try/catch` at the screen level. No `Result<T,E>`.

### Rationale

- Every service call is sequential and single-consumer (one screen calls one service)
- No pipelining or chaining where Result composition adds value
- TypeScript `try/catch` with custom error classes is well-understood and requires no library
- Zod already uses throw/safeParse pattern; mixing two error styles is confusing
- Screen catches error → renders error state. There is no third path.

### Consequences

- Lower ceremony for simple flows
- Error handling is centralized at the screen boundary
- If the app grows a service layer with multiple consumers, Result types can be introduced per-service

---

## ADR-003: Zod at Every Boundary

**Status:** Accepted  
**Date:** 2026-05-31

### Context

User input (URL, city, messages), API responses (NewsAPI JSON), and AI output (Gemini structured responses) are all external, untrusted data. TypeScript types are compile-time only.

### Decision

Validate every external data source with Zod `.parse()` (throws) or `.safeParse()` (returns result) at the service layer.

### Boundaries

| Boundary | Schema | Action on failure |
|----------|--------|-------------------|
| User URL input | `z.string().url()` | Show "Invalid URL" inline error |
| User city input | `z.string().min(1).max(100)` | Show "Invalid location" |
| Chat message | `z.string().min(1).max(5000)` | Show "Message too long" |
| NewsAPI response | `z.object({ status: z.literal("ok"), articles: z.array(...) })` | Show "Unexpected API response" |
| AI extraction output | `z.object({ title: z.string(), summary: z.string(), keyPoints: z.array(z.string()) })` | Show raw text with "Unexpected format" |
| AI summary output | `z.object({ summary: z.string(), relevance: z.string() })` | Show "Summary unavailable" |
| Environment config | `z.object({ GEMINI_API_KEY: z.string().min(1), NEWS_API_KEY: z.string().min(1) })` | Fail on startup with clear message |

### Consequences

- Runtime type safety independent of TypeScript
- Validation failure produces a user-visible message, never a crash
- Schemas are the source of truth for external data shapes
- Slight verbosity at boundaries is acceptable for correctness

---

## ADR-004: OpenTUI React over Core Construct API

**Status:** Accepted  
**Date:** 2026-05-31

### Context

OpenTUI provides two APIs: the core Construct API (factory functions like `Text({...})`, `Box({...})`) and the React bindings (`<text>`, `<box>` JSX with `createRoot`).

### Decision

Use **React bindings** (`@opentui/react`) exclusively.

### Rationale

- JSX is React-native; component composition, hooks, and state management work naturally
- The Construct API requires manual event listeners and imperative focus management
- React provides `useKeyboard`, `useTerminalDimensions`, `useOnResize` hooks
- Feature-based architecture maps to React component hierarchy
- `createRoot(renderer).render(<App />)` is the documented pattern

### Consequences

- Requires `jsxImportSource: "@opentui/react"` in tsconfig
- JSX elements are lowercase (`<text>`, `<box>`, `<input>`, `<markdown>`)
- No mixing of Construct and React APIs (cleaner mental model)

---

## ADR-005: Single AI Provider (Gemini) via Vercel AI SDK

**Status:** Accepted  
**Date:** 2026-05-31

### Context

User will provide a Gemini API key. Multiple AI SDKs exist: raw Google SDK (`@google/generative-ai`) and Vercel AI SDK (`ai` + `@ai-sdk/google`).

### Decision

Use **Vercel AI SDK** (`ai` + `@ai-sdk/google`).

### Rationale

- Provider-agnostic interface: if we ever switch to OpenAI or Anthropic, only the provider import changes
- Built-in streaming via `streamText()` — handles async iteration natively
- Familiar API: `generateText()` for one-shot, `streamText()` for chat
- Better TypeScript DX than raw Google SDK

### Consequences

- Dependency: `ai` + `@ai-sdk/google`
- Single provider means no provider abstraction layer needed in lib/ai.ts
- If multi-provider is needed later, `lib/ai.ts` can become an adapter without changing services

---

## ADR-006: Error Messages as Constructor Arguments, Not String Constants

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Error messages could be defined as constants, inline strings, or passed as constructor arguments to error classes.

### Decision

Pass error messages **as constructor arguments** to `AppError`. Messages are specific to the failure context (include the URL, the status code, the field name).

### Rationale

- Specific messages are more useful than generic codes
- Service code constructs the message with context: `new AppError("Failed to fetch ${url}: ${err.message}", "NETWORK_ERROR", true)`
- Screen just renders `error.message` — no mapping needed
- Avoids a separate error message constants file that would be incomplete anyway

### Consequences

- Messages are duplicated if the same failure happens in different contexts (acceptable — context matters)
- Error codes (`VALIDATION_ERROR`, etc.) allow programmatic handling if needed later
- Messages are user-facing; should be clear, not technical jargon

---

## ADR-007: Sidebar over Hub-and-Return Navigation

**Status:** Accepted  
**Date:** 2026-05-31

### Context

The initial design had a Home/Menu screen that the user returned to via Escape before picking another tool. This is two-step navigation (tool → Escape → Home → pick → tool) every time the user switches.

### Decision

Replace the home screen with a **persistent left sidebar**. The app launches directly into the Web Scraper. Sidebar has 3 items: Scrape, Chat, News.

### Rationale

- **One-step switching**: sidebar is always visible, always one Enter press away
- **Zero redundant clicks**: no "go back home" step between tools
- **Professional TUI pattern**: mirrors htop, lazygit, ncmpcpp — sidebar IS the navigation
- **3 items fit perfectly**: no scroll, no categories, no overflow
- **Faster iteration**: user can bounce between scraping, chatting, and news without losing context

### Consequences

- No home screen to show "welcome" or "recent activity"
- No Escape-to-home key; Escape is available per-screen for cancel/reset
- Screen switching unmounts the previous tool (state not preserved across switches)
- Sidebar must handle focus management independently from content area
- Tab key shifts focus between sidebar and content (accessibility)

---

## ADR-008: Write-Through Cache with TTL over LRU or Stale-While-Revalidate

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Web scraper and news features make network calls that return the same result for the same input within a time window. Duplicate calls within that window waste tokens (Gemini) and API quota (NewsAPI).

### Decision

Use a simple **in-memory `Map<string, { data, expiresAt }>` with TTL-based eviction**. Write-through pattern: on miss, fetch → store → return; on hit, return cached.

### Rationale

- **Not LRU**: Only 2 features use cache (~50 entries max). Eviction by expiry is sufficient; eviction by recency adds complexity for no benefit.
- **Not stale-while-revalidate**: TUI is single-user; the user explicitly re-submits when they want fresh data. Background refreshes add complexity without UX value.
- **Not disk-backed**: Cache is for transient API results, not long-term data. Persistence is SQLite's job (chat messages).
- **No deduplication**: Single-user app; concurrent duplicate requests are practically impossible.

### Consequences

- Cache is lost on app restart (acceptable — scraper/news results are cheap to re-fetch)
- Each cache entry stores the full response (scraper result ~1KB, news response ~10KB)
- Simple implementation: single file, no dependencies

---

## ADR-009: SQLite (bun:sqlite) over MongoDB for Persistence

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Chat messages and sessions need to persist across app restarts. Two options considered: SQLite (via `bun:sqlite`, built into Bun) and MongoDB (requires external server + npm driver).

### Decision

Use **`bun:sqlite`** (zero dependencies, embedded, portable).

### Rationale

| Factor | SQLite (bun:sqlite) | MongoDB |
|--------|---------------------|---------|
| Setup | Zero — `import { Database } from "bun:sqlite"` | Install + run mongod |
| Dependencies | 0 (built into Bun) | mongodb npm package |
| Data model | Messages are relational by nature | Documents work but no benefit |
| Portability | Single `.db` file | Requires server process |
| Concurrency | Single-writer (fine for TUI) | Multi-writer (overkill) |
| Query simplicity | Simple SQL | Simple find() |

### Schema

```sql
CREATE TABLE sessions (id TEXT PK, title TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE messages (id INTEGER PK, session_id TEXT FK, role TEXT, content TEXT, created_at TEXT);
```

### Consequences

- Zero additional dependencies
- DB file lives at `data/chat.db` next to the app
- Schema migrations done via `CREATE TABLE IF NOT EXISTS` on app start
- Synchronous reads are fine (< 1000 messages total in a TUI app)

---

## ADR-010: Full Session Management in Chat

**Status:** Accepted  
**Date:** 2026-05-31

### Context

Chat persists messages to SQLite. With persistence comes the need to organize conversations: create new sessions, switch between them, delete old ones, and name them meaningfully.

### Decision

Implement **full session management** in the Chat feature: list, create, switch, delete, rename, and auto-title sessions.

### Rationale

- **List**: Users need to see what conversations exist and pick one
- **Create**: Starting a new topic should be explicit (Ctrl+N)
- **Switch**: Quick navigation between sessions (↑/↓ + Enter)
- **Delete**: Old conversations accumulate without a cleanup mechanism
- **Auto-title**: After first exchange, Gemini generates a short title — removes the friction of manual naming and keeps the session list informative
- **Rename**: Users can override auto-titles with Ctrl+R

### Consequences

- Chat screen has two modes: chat (default) and session list (toggle with Ctrl+S/Tab)
- Session list is an overlay, not a separate screen — user stays in context
- Auto-titling is async and non-blocking (doesn't delay the chat flow)
- Delete shows a confirmation step before removing
- Notable code in ChatScreen increases from ~120 lines to ~250 lines

---

## ADR-011: Inline Handlers over useCallback/useMemo (React Compiler)

**Status:** Accepted  
**Date:** 2026-05-31

### Context

React hooks like `useCallback` and `useMemo` are traditionally used to prevent unnecessary re-renders. The React Compiler (React 19+) automates this optimization.

### Decision

Use **inline functions everywhere**. No `useCallback`, no `useMemo`, no `React.memo`. Let the React Compiler handle memoization.

### Rationale

- React 19's compiler automatically memoizes components, hooks, and derived values
- Manual memoization is error-prone (stale closures, incorrect dep arrays)
- In a TUI app with 3 screens, rendering performance is not a bottleneck
- If the compiler is unavailable (e.g., Bun's transpiler doesn't support it yet), the app still works — just without optimization

### Consequences

- Code is simpler and more readable
- No risk of stale closure bugs from incorrect dep arrays
- All `useKeyboard` handlers are plain inline functions
- If performance issues arise later, they'll be measured before adding manual memoization
