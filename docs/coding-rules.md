# Coding Rules

## TypeScript

- **strict: true** in tsconfig. No `any`, no `// @ts-ignore`, no `as any` casts.
- Prefer `const` over `let`. Prefer `readonly` on interfaces and arrays.
- Use explicit return types on all function declarations (not arrow functions assigned to variables).
- Use `interface` for public contracts, `type` for unions and mapped types.
- Use classes for service/infrastructure modules that bundle state with methods and benefit from dependency injection (e.g., `Fetcher`, `AiClient`, `ScraperService`). Prefer plain functions for pure utilities (helpers, formatters, validators).
- Compose classes via constructor injection (has-a, not is-a). Each service exports a composed singleton at module level.

## File Organization

- One primary export per file (default or named). Utility files may have multiple.
- File name matches the primary export name (kebab-case for services/schemas, PascalCase for components).
- Maximum ~200 lines per file. Split services that exceed this.
- Feature folders own: `.tsx` (screen), `service.ts` (orchestration), `schemas.ts` (feature-specific schemas).

## Component Patterns

- Functional components with hooks. No class components.
- State lives in the component or in React state. No external state management.
- Every component handles: **default/loading/error/empty** states.
- No prop drilling beyond 2 levels. Use composition (children) if deeper.
- Event handlers are inline. No `useCallback`, no `useMemo`, no `React.memo` — trust the React Compiler.

## Memoization

- **No manual memoization.** No `useCallback`, `useMemo`, or `React.memo`.
- All event handlers, keyboard handlers, and derived values are plain inline functions.
- If the React Compiler is unavailable, the app still works — just without optimization.
- Only add manual memoization if profiling proves a measurable performance problem.

## OpenTUI Conventions

- JSX elements are lowercase: `<text>`, `<box>`, `<input>`, `<markdown>`, `<scrollbox>`.
- Style via `style` prop with camelCase properties: `{ flexDirection: "column", gap: 1 }`.
- `useKeyboard` for global key handlers (navigation). Input components handle their own keys.
- Sidebar navigation: `↑`/`↓` to move, `Enter` to switch, `1`/`2`/`3` for direct jump.
- `q` or `Ctrl+C` exits the app. Escape is available per-screen for cancel/reset.
- Layout is `flexDirection: "row"` with sidebar (22-char fixed width) + content area.
- Conditional rendering: use `<Activity mode={condition ? "visible" : "hidden"}>` (import from `react`). Never `{condition && <element>}` — OpenTUI's reconciler leaks `false`/`undefined` to `TextNodeRenderable`, causing a runtime crash.
- Use `useTerminalDimensions()` if layout depends on terminal size.

## Component Responsibilities

### Sidebar
- Owns `activeScreen` display and keyboard focus for navigation
- Renders header ("tui-ai"), 3 items (Scrape/Chat/News), footer ("q: quit")
- Active item shown with `●` + accent background, inactive with `○`
- `↑`/`↓` cycles selection, `Enter` calls `onNavigate(screen)`
- No scroll needed (3 items)

### ChatScreen
- Two modes: chat (default) and session list (toggle)
- Chat mode: input + message stream + status
- Session list: overlay with create/switch/delete/rename
- All messages persisted to SQLite via lib/storage
- Auto-title sessions after first exchange (async, non-blocking)

## Error Handling

- Catch all errors at the screen level. Services throw `AppError`.
- Never `console.log` errors. Display them in the UI.
- Validate with Zod before any operation. If validation fails, render error — don't proceed.

```
// Pattern:
try {
  const result = await someService(input)
  // render result
} catch (err) {
  const message = err instanceof AppError ? err.message : "Unexpected error"
  // render error state with message
}
```

## Cache Pattern

- Check cache before network calls.
- Set cache after successful network response.
- Cache key format: `feature:identifier` (e.g., `scraper:${url}`, `news:${query}`).
- TTL: 1 hour for scraper, 10 minutes for news.
- Re-submitting the same query overwrites the cache (acts as force refresh).

```
// Pattern:
const cacheKey = `scraper:${url}`
const cached = cache.get(cacheKey)
if (cached) return cached

const result = await fetchAndExtract(url)
cache.set(cacheKey, result, 3_600_000) // 1 hour
return result
```

## Validation

- `parse()` (throw) for startup/init — fail fast on config errors
- `safeParse()` (return result) for runtime user input — graceful error display
- `parse()` for API responses — malformed API = fail the operation

## Import Order

1. External packages (react, ai, zod, @opentui/*)
2. Bun built-ins (bun:sqlite)
3. Shared lib (src/lib/*)
4. Shared schemas (src/schemas/*)
5. Feature imports (../service)
6. Theme/Config/Errors (src/theme, src/config, src/errors)
7. Types

Within each group: alphabetical, no blank lines between same-group imports.

## Naming

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `WebScraperScreen.tsx` |
| Service files | kebab-case with `-service` | `scraper-service.ts` |
| Schema files | kebab-case with `-schemas` | `news-schemas.ts` |
| Lib files | kebab-case | `fetcher.ts`, `ai.ts`, `cache.ts` |
| Error classes | PascalCase ending in Error | `AppError`, `ValidationError` |
| Zod schemas | camelCase ending in Schema | `urlSchema`, `citySchema` |
| Event handlers | `handle` prefix | `handleSubmit`, `handleKeyPress` |
| Boolean props/state | `is`/`has` prefix | `isLoading`, `hasError` |

## Comments

- No comments that explain what the code does (the code should be self-documenting).
- Comments only for _why_ a non-obvious decision was made.
- No commented-out code. Delete it.

## Git / Commits

- Only commit when explicitly asked.
- Commit messages: present tense, imperative mood, no period.
- Example: `add URL validation to web scraper input`
