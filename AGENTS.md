# AGENTS.md

## Project

Terminal UI app (`tui-ai-hub/`) with 3 AI-powered tools: Web Scraper, Chat, News. Built with OpenTUI + React, Gemini via Vercel AI SDK. Published to npm as `tui-ai-hub`.

## Runtime

- **Bun** required (OpenTUI depends on it). Must run from `tui-ai-hub/`.
- TypeScript 6.0, React 19, `moduleResolution: "bundler"`
- Path alias `@/` → `src/` (configured in tsconfig)

## Commands

```sh
bun run index.tsx        # start
bun --watch run index.tsx  # dev with watch
bun run build            # bundle to dist/
bun run lint             # lint with oxlint
bun run lint:fix         # lint + auto-fix
bun run fmt              # format with oxfmt (src/ + index.tsx)
bun run fmt:check        # check formatting
```

## Release (semantic-release)

Versioning and npm publishing are automated via `.github/workflows/release.yml`. Uses semantic-release with conventional commits.

### Commit format

| Prefix | Version bump |
|--------|-------------|
| `fix:` | Patch (1.0.0 → 1.0.1) |
| `feat:` | Minor (1.0.0 → 1.1.0) |
| `feat!:` or `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) |

Examples:
- `feat: add dark mode` → minor bump
- `fix: correct url validation` → patch bump
- `feat!: redesign api` → major bump

### Workflow

Push to `master` → CI runs lint + build → semantic-release analyzes commits → bumps version → publishes to npm → creates GitHub release.

### Required secrets

- `NPM_TOKEN` — npm access token (classic, with `publish` permission). Add in GitHub repo → Settings → Secrets and variables → Actions.

## Architecture

- **Constants** (`src/constants/`): `api.ts` (URLs, model), `timing.ts` (TTLs, timeouts, limits), `keys.ts` (keyboard shortcuts), `regex.ts` (compiled patterns), `ui.ts` (dimensions, unicode chars)
- **Feature-based** (`src/features/{scraper,chat,news}/`), each with `<Name>Screen.tsx` + `<name>-service.ts`
- **Layers**: Constants → Screen → Service → Lib → Schema/Config/Errors. Screens never import lib directly.
- Every service exports a module-level singleton (e.g. `scraperService`, `chatService`)
- AI: Gemini 2.0 Flash via `ai` + `@ai-sdk/google` (Vercel AI SDK)
- Persistence: `bun:sqlite` at `data/chat.db` (auto-created)
- Cache: in-memory `Map` with TTL (1h scraper, 10min news)
- OpenTUI React: `jsxImportSource: "@opentui/react"`, lowercase elements (`<text>`, `<box>`, `<input>`, `<markdown>`, `<scrollbox>`)

## Env

Copy `.env` to `tui-ai-hub/` — requires `GEMINI_API_KEY` and `NEWS_API_KEY`. App fails at startup if either is missing.

## Preferences

- Prefer `switch` over chained `if`/`else` when matching multiple values against a single expression.

## Conventions

| Rule | Detail |
|------|--------|
| Errors | `AppError` class, try/catch at screen level. No `Result<T,E>`. |
| Validation | Zod `parse()` (throw) for startup/API, `safeParse()` for user input. |
| Memoization | **None**. No `useCallback`, `useMemo`, `React.memo` — inline functions only. |
| TypeScript | `strict: true`. No `any`, no `// @ts-ignore`, no `as any`. |
| Naming | kebab-case for services/schemas, PascalCase for components/screens. |
| Exports | One primary export per file. |
| File size | Max ~200 lines. |
| Imports | external → bun builtins → `@/constants` → `@/lib` → `@/schemas` → `../service` → theme/config/errors |
| Conditional rendering | Use `<Activity mode={condition ? "visible" : "hidden"}>` from `react`. Never `{condition && <element>}` — OpenTUI's reconciler leaks `false`/`undefined` to `TextNodeRenderable`. Import `Activity` from `"react"`. |

## Navigation

- `1`/`2`/`3` — jump to Scrape/Chat/News
- `Tab` — toggle focus: sidebar ↔ content
- `↑`/`↓` — sidebar nav / session list nav
- `q` or `Ctrl+C` — exit
- Chat: `Ctrl+S`/`Tab` session list, `Ctrl+N` new, `Ctrl+D` delete, `Ctrl+R` rename
- Layout: `flexDirection: "row"`, sidebar fixed at 22 chars
