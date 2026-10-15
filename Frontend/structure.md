# Project Structure

High-level mapping of where related logic resides.

```
src/
├── lib/
│   ├── server/          — Server-side logic (DB, AI, Bible API, MCP)
│   ├── components/      — Svelte components (UI primitives + feature components)
│   ├── stores/          — Svelte 5 reactive stores
│   ├── types/           — Shared TypeScript types
│   └── utils/           — Client-side utilities
├── routes/              — SvelteKit pages and API endpoints
└── app.html             — HTML shell
```

## Folder Map

| Folder                 | Purpose                                                              | README                                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/`      | Database client, AI orchestration, Bible API integration, MCP server | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/README.md)                                                                                                                                                                     |
| `src/lib/server/auth/` | Custom session, password, OTP, and rate-limit logic                  | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/README.md)                                                                                                                                                                |
| `src/lib/components/`  | All Svelte components — UI primitives and feature-specific           | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/README.md)                                                                                                                                                                 |
| `src/routes/`          | Pages, layouts, and API endpoints                                    | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/README.md)                                                                                                                                                                         |
| `drizzle/`             | PostgreSQL migrations and RLS setup                                  | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/drizzle/README.md)                                                                                                                                                                            |
| `.agents/`             | Confirmed architecture and implementation constraints                | [README](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/.agents/README.md)                                                                                                                                                                            |
| `src/lib/stores/`      | Reactive state management (session, user)                            | —                                                                                                                                                                                                                                                       |
| `src/lib/types/`       | Shared TypeScript interfaces and types                               | —                                                                                                                                                                                                                                                       |
| `src/lib/utils/`       | Time detection, input validation, helpers                            | —                                                                                                                                                                                                                                                       |
| `docs/`                | Architecture, implementation stages, and verification methods        | [ARCHITECTURE](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/ARCHITECTURE.md), [STAGES](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/stages.md), [VERIFICATION](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/verification.md) |

## Key Logic Locations

- To find **AI story selection logic** visit [ai.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/ai.ts)
- To find **Bible passage fetching** visit [bible.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/bible.ts)
- To find **MCP server definition** visit [mcp/server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/mcp/server.ts)
- To find **Database client** visit [db/index.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/db/index.ts)
- To find **Authentication logic** visit [auth/README.md](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/README.md)
- To find **Quote selection logic** visit [quotes.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/quotes.ts)
- To find **Alternative reuse logic** visit [reuse.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/reuse.ts)
- To find **MCP endpoint** visit [api/mcp/+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/api/mcp/+server.ts)
- To find **Main page (welcome + input)** visit [+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+page.svelte)
- To find **Alternatives UI** visit [AlternativeCard.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/AlternativeCard.svelte)
