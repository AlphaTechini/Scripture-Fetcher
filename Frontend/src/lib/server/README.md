# Server Logic (`src/lib/server/`)

All server-side modules. These files are never imported in client-side code — SvelteKit enforces this via the `$lib/server` convention.

## Modules

| File                                                                                                 | Purpose                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [db/index.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/db/index.ts)           | Private PostgreSQL connection and Drizzle client initialization                                                                               |
| [auth.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth.ts)                   | Opaque, database-backed session creation, lookup, and revocation                                                                              |
| [auth/](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/README.md)              | Password validation, OTP verification, email delivery, and authentication rate limiting                                                       |
| [authorization.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/authorization.ts) | Explicit resource ownership checks used by authenticated mutations                                                                            |
| [ai.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/ai.ts)                       | Anthropic Claude Haiku 5.5 orchestration: prompt construction for 3-alternative story selection, structured-output API call, response parsing |
| [bible.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/bible.ts)                 | API.Bible integration — fetch passage text by reference                                                                                       |
| [quotes.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/quotes.ts)               | Quote selection logic — picks from pre-seeded pool based on time context and recent history                                                   |
| [reuse.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/reuse.ts)                 | Alternative reuse logic — queries unpicked alternatives matching mood + category, selects up to 2 for reuse, copies into new session          |

## MCP Subdirectory (`mcp/`)

| File                                                                                       | Purpose                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/mcp/server.ts) | MCP server definition — registers tools, configures Streamable HTTP transport                                                                                                                                       |
| [tools.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/mcp/tools.ts)   | Individual MCP tool handlers — `get_reading_history`, `get_passages_read`, `get_comments`, `get_usage_metrics`, `get_session_details`, `get_quote_history`, `get_alternatives_by_type`, `get_unpicked_alternatives` |

## Architectural Decisions

- **No DB caching for Bible passages.** The AI fetches passage text from API.Bible or web search at request time. No local text cache.
- **No server-side passage validation.** The AI is trusted to return accurate references. The generation route does not call an external search tool.
- **Single Anthropic call per session.** Story selection (3 alternatives with all passages) + prayer point generation happen in one round-trip to minimize latency and cost.
- **MCP as SvelteKit routes.** The MCP server uses Streamable HTTP transport, implemented as a standard SvelteKit API endpoint. No separate process.
- **Story-based, not passage-based.** Each alternative is a complete Bible narrative spanning multiple passages, chapters, or books. The AI identifies narrative arcs, not isolated verses.
- **Category-scoped history queries.** When fetching reading history for the AI prompt, only query alternatives and passages matching the current `category` (and `mood`). This reduces DB reads and keeps the AI prompt focused on relevant context.
- **Alternative reuse system.** Unpicked alternatives from previous sessions can be reused if the current request's mood + category exactly match the original session's mood + category. Maximum 2 reused alternatives per session; at least 1 fresh alternative is always generated. Reused alternatives are copied into the new session with a `reused_from` reference to the original row.
- **Explicit pick action.** Users must explicitly pick one alternative per session. Picked alternatives are consumed (`picked = true`) and cannot be reused. Unpicked alternatives remain available for future reuse.
- **Database-backed custom authentication.** Opaque browser tokens support revocation, and OTP hashes, attempt limits, and send limits are persisted for serverless consistency.
- **Explicit authorization.** User ownership is checked in server queries because custom sessions do not populate Supabase `auth.uid()`.

To find authentication logic visit [auth/README.md](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/README.md).

The database connection can be found in [db/index.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/db/index.ts).
