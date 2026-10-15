# Scripture Fetcher

A personal Bible study companion that uses AI to surface **complete Bible stories** — not isolated passages — based on mood, category, and time context. Each session returns three story-based alternatives (category-driven, historical-context-driven, and user-directed), each spanning multiple chapters or books, with prayer points and intelligent repetition avoidance.

## Tech Stack

- **Framework:** SvelteKit (fullstack)
- **Frontend:** Svelte 5, Tailwind CSS v4
- **Backend:** SvelteKit API routes
- **Database:** Supabase Postgres with custom database-backed authentication
- **AI:** Anthropic Claude Haiku 5.5 (`claude-haiku-5-5`) via the Messages API with structured outputs
- **Bible Data:** API.Bible (Starter plan)
- **MCP:** Streamable HTTP endpoint for external LLM access
- **Deployment:** Vercel (`@sveltejs/adapter-vercel`)

## Getting Started

```sh
pnpm install
pnpm dev
```

## Documentation

- [Project Structure](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/structure.md)
- [Architecture](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/ARCHITECTURE.md)
- [Implementation Stages](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/stages.md)
- [Verification Methods](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/verification.md)

## Folder READMEs

- [Server Logic](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/README.md)
- [Components](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/README.md)
- [Routes](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/README.md)
