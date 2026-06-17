# Routes (`src/routes/`)

SvelteKit file-based routing. Each directory maps to a URL path.

## Pages

| Route | Files | Purpose |
|-------|-------|---------|
| `/` | [+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+page.svelte), [+page.server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+page.server.ts) | Home page — welcome header, motivational quote, input form (with additional notes) |
| `/session/[id]` | [+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/session/[id]/+page.svelte), [+page.server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/session/[id]/+page.server.ts) | Session results — 3 alternatives with passages, prayer points, comments, verse tracker |
| `/history` | [+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/history/+page.svelte), [+page.server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/history/+page.server.ts) | History & metrics — timeline, streak, category distribution |
| `/auth/login` | [+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/auth/login/+page.svelte) | Login page (Supabase Auth) |

## Layouts

| File | Purpose |
|------|---------|
| [+layout.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+layout.svelte) | Root layout — imports global CSS, fonts, nav, parchment background |
| [+layout.server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+layout.server.ts) | Auth check — validates Supabase session, loads user profile |

## API Endpoints

| Route | File | Purpose |
|-------|------|---------|
| `/api/scripture` | [+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/api/scripture/+server.ts) | POST — AI story selection (accepts mood, category, time context, notes; returns 3 alternatives with passages + prayer points) |
| `/api/mcp` | [+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/api/mcp/+server.ts) | MCP Streamable HTTP endpoint — external LLM access to app data |

## Auth Routes

| Route | File | Purpose |
|-------|------|---------|
| `/auth/callback` | [+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/auth/callback/+server.ts) | OAuth callback handler — exchanges code for session |

## Data Loading Pattern

- **Server load functions** (`+page.server.ts`) handle all data fetching and auth checks.
- **Form actions** (`+page.server.ts` `actions`) handle mutations (save comment, mark verses, bookmark).
- **API routes** (`+server.ts`) handle async operations (AI calls, MCP).
- Client components receive data via `$props()` from the page's `data` export.
