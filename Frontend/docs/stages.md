# Implementation Stages

Each stage is self-contained. At the end of every stage, the system must pass all listed thresholds before proceeding. No stage is considered complete until every threshold is verified via the methods in [verification.md](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/verification.md).

**Order:** Backend first, then frontend.

---

## Stage 1: Schema + Drizzle Setup

**Goal:** Define the complete database schema using Drizzle ORM and push it to Supabase Postgres. Verify that all tables, relations, constraints, and indexes work correctly through actual CRUD operations.

### Implementation

1. Install `drizzle-orm@0.45.2`, `drizzle-kit`, `postgres` (postgres.js driver)
2. Create `src/lib/server/db/schema.ts` — all table definitions:
   - `users`
   - `motivational_quotes`
   - `quote_logs`
   - `sessions`
   - `alternatives` (with `picked` boolean, `reused_from` self-reference)
   - `passages`
   - `prayer_points`
   - `comments`
   - `verses_read`
   - `bookmarks`
3. Create `src/lib/server/db/index.ts` — Drizzle client initialization using Supabase pooler connection string with `sslmode=require`
4. Create `drizzle.config.ts` — Drizzle Kit configuration
5. Run `drizzle-kit push` to sync schema to Supabase
6. Add DB scripts to `package.json`: `db:push`, `db:generate`, `db:migrate`, `db:studio`

### Test Thresholds

| #    | Test                                                                                                                       | Expected Result                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1.1  | Insert a row into `users`                                                                                                  | Row created, UUID returned, `created_at` auto-populated                                        |
| 1.2  | Insert a row into `motivational_quotes` with `mood_tags`, `category_tags`, `season_tags` arrays                            | Row created, arrays stored correctly, queryable                                                |
| 1.3  | Insert a row into `sessions` linked to the user                                                                            | Row created, FK constraint valid                                                               |
| 1.4  | Insert 3 rows into `alternatives` linked to the session (one per influence_type: `primary`, `historical`, `user_directed`) | All 3 created, `picked` defaults to `false`, CHECK constraint rejects invalid `influence_type` |
| 1.5  | Insert 2+ rows into `passages` linked to one alternative                                                                   | Rows created, `order_index` respected                                                          |
| 1.6  | Insert 8+ rows into `prayer_points` linked to one alternative                                                              | Rows created, `passage_ref` nullable, `order_index` respected                                  |
| 1.7  | Insert a row into `comments` linked to session + user                                                                      | Row created                                                                                    |
| 1.8  | Insert a row into `verses_read` linked to session + user + alternative                                                     | Row created                                                                                    |
| 1.9  | Insert a row into `bookmarks` linked to session + user                                                                     | Row created                                                                                    |
| 1.10 | Insert a row into `quote_logs` linked to user + quote                                                                      | Row created                                                                                    |
| 1.11 | Update `alternatives.picked` to `true`                                                                                     | Update succeeds                                                                                |
| 1.12 | Set `alternatives.reused_from` to another alternative's ID                                                                 | Self-reference FK valid                                                                        |
| 1.13 | Delete a session (CASCADE)                                                                                                 | All linked alternatives, passages, prayer_points, comments, verses_read, bookmarks deleted     |
| 1.14 | Attempt to insert an alternative with invalid `influence_type` (e.g., `'invalid'`)                                         | CHECK constraint rejects the insert                                                            |
| 1.15 | Query `alternatives` WHERE `picked = false` AND join to `sessions` WHERE `mood = 'Joyful'` AND `category = 'Faith'`        | Returns only matching rows                                                                     |
| 1.16 | Query `passages` for a given alternative, ordered by `order_index`                                                         | Returns passages in correct order                                                              |
| 1.17 | Query `prayer_points` for a given alternative, ordered by `order_index`                                                    | Returns prayer points in correct order                                                         |
| 1.18 | Query `verses_read` grouped by `session_id` and `alternative_id`                                                           | Returns grouped results                                                                        |
| 1.19 | Count total rows in each table after all inserts                                                                           | Counts match expected values                                                                   |
| 1.20 | Run `drizzle-kit studio` and visually confirm all tables and data                                                          | All tables visible, data correct                                                               |

**Pass criteria:** All 20 tests pass. No type errors. `pnpm check` clean.

---

## Stage 2: Supabase Auth + RLS Policies

**Goal:** Set up Supabase Auth (email/password + Google OAuth), configure Row Level Security on all tables, and wire auth into the SvelteKit layout. Verify that authenticated users can only access their own data.

### Implementation

1. Install `@supabase/supabase-js`, `@supabase/ssr`
2. Create `src/lib/server/db/supabase.ts` — Supabase server client
3. Create `src/lib/server/auth.ts` — Auth helpers (get session, require auth)
4. Create RLS migration SQL:
   - Enable RLS on all user-scoped tables
   - Policies: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE
   - Special: `alternatives` and `passages` and `prayer_points` accessed via session ownership (JOIN through `sessions`)
5. Wire `+layout.server.ts` to check auth on every request
6. Create `/auth/login` page (basic form)
7. Create `/auth/callback` handler for OAuth

### Test Thresholds

| #    | Test                                                      | Expected Result                                                |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 2.1  | Sign up a new user via Supabase Auth                      | User created in `auth.users`, profile row created in `users`   |
| 2.2  | Sign in with email/password                               | Valid session returned, `+layout.server.ts` loads user profile |
| 2.3  | Access `/` while unauthenticated                          | Redirect to `/auth/login`                                      |
| 2.4  | Insert a session as User A                                | Succeeds                                                       |
| 2.5  | Query sessions as User A                                  | Returns only User A's sessions                                 |
| 2.6  | Query sessions as User B                                  | Returns 0 rows (RLS blocks User A's data)                      |
| 2.7  | Insert an alternative linked to User A's session          | Succeeds                                                       |
| 2.8  | Query alternatives (via session JOIN) as User B           | Returns 0 rows                                                 |
| 2.9  | Insert a comment as User A on User A's session            | Succeeds                                                       |
| 2.10 | Attempt to insert a comment as User B on User A's session | Fails (RLS or FK violation)                                    |
| 2.11 | Insert verses_read as User A                              | Succeeds                                                       |
| 2.12 | Query verses_read as User B                               | Returns 0 rows                                                 |
| 2.13 | Sign out                                                  | Session invalidated, redirect to `/auth/login`                 |
| 2.14 | Google OAuth flow (if configured)                         | User authenticated, profile created/linked                     |

**Pass criteria:** All 14 tests pass. RLS confirmed blocking cross-user access. No auth bypass possible.

---

## Stage 3: Bible API Integration

**Goal:** Build the API.Bible client module that fetches passage text by reference. Verify it handles valid references, invalid references, and rate limiting gracefully.

### Implementation

1. Create `src/lib/server/bible.ts`:
   - `fetchPassage(reference: string, translationId: string)` — calls API.Bible REST endpoint
   - Error handling for 404 (invalid reference), 429 (rate limit), 500 (server error)
   - Response parsing: extract passage text, book, chapter, verse range
2. Store API.Bible key in `.env` as `API_BIBLE_KEY`
3. Determine translation IDs for preferred translations (KJV, etc.)

### Test Thresholds

| #   | Test                                                                           | Expected Result                                        |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 3.1 | Fetch "John 3:16" (KJV)                                                        | Returns correct passage text, book="John", chapter="3" |
| 3.2 | Fetch "Romans 8:28-30" (KJV)                                                   | Returns multi-verse passage, correct text              |
| 3.3 | Fetch "1 Samuel 17" (full chapter)                                             | Returns full chapter text                              |
| 3.4 | Fetch "Genesis 1:1-31" (full chapter range)                                    | Returns all 31 verses                                  |
| 3.5 | Fetch an invalid reference (e.g., "FakeBook 1:1")                              | Returns error/empty, does not crash                    |
| 3.6 | Fetch with an invalid API key                                                  | Returns auth error, does not crash                     |
| 3.7 | Fetch 10 passages in sequence                                                  | All succeed within rate limits                         |
| 3.8 | Verify response includes `book`, `chapter`, `reference`, `passage_text` fields | All fields present and typed correctly                 |

**Pass criteria:** All 8 tests pass. No unhandled exceptions. Rate limit responses handled gracefully.

---

## Stage 4: Quote Engine

**Goal:** Seed the `motivational_quotes` table with verified Bible verses and build the quote selection logic that picks a quote based on time context and recent history.

### Implementation

1. Create seed data: ~150-200 verified Bible verses with mood/category/season tags
2. Create seed script or migration to populate `motivational_quotes`
3. Create `src/lib/server/quotes.ts`:
   - `selectQuote(userId, timeOfDay, season)` — picks a quote weighted by time context, avoiding recently shown quotes
   - `logQuote(userId, quoteId)` — logs to `quote_logs`
4. Wire into `+page.server.ts` load function

### Test Thresholds

| #    | Test                                                        | Expected Result                                                            |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| 4.1  | Seed script inserts 150+ quotes                             | All rows created, arrays populated                                         |
| 4.2  | Query quotes WHERE `mood_tags` contains 'Joyful'            | Returns matching quotes                                                    |
| 4.3  | Query quotes WHERE `category_tags` contains 'Faith'         | Returns matching quotes                                                    |
| 4.4  | Query quotes WHERE `season_tags` contains 'Christmas'       | Returns matching quotes                                                    |
| 4.5  | Call `selectQuote()` for a user with no history             | Returns a valid quote                                                      |
| 4.6  | Call `selectQuote()` 10 times for the same user             | Returns different quotes (not the same one repeated)                       |
| 4.7  | Call `logQuote()` after selection                           | Row created in `quote_logs` with correct `user_id`, `quote_id`, `shown_at` |
| 4.8  | Query `quote_logs` for a user, ordered by `shown_at` DESC   | Returns chronological log                                                  |
| 4.9  | Call `selectQuote()` with timeOfDay='Morning'               | Returns a quote (may be weighted toward morning-appropriate tags)          |
| 4.10 | Call `selectQuote()` with season='Christmas'                | Returns a quote (may be weighted toward Christmas tags)                    |
| 4.11 | Verify no quote has empty `verse_text` or `verse_reference` | All quotes have both fields populated                                      |

**Pass criteria:** All 11 tests pass. Seed data verified as real Bible verses (spot-check 10 random quotes against a Bible).

---

## Stage 5: AI Story Selection + Prayer Points

**Goal:** Build the Anthropic Claude Haiku 5.5 integration that generates 3 story-based alternatives with passages and prayer points. Verify structured output matches the expected schema.

### Implementation

1. Use the native `fetch` API against the Anthropic Messages API endpoint
2. Create `src/lib/server/ai.ts`:
   - `generateAlternatives(inputs)`: constructs system prompt, calls `claude-haiku-5-5` with structured outputs, parses the JSON response
   - System prompt includes: story composition rules, 3-alternative structure, prayer point instructions
   - Structured output guaranteed by `output_config.format` JSON schema
3. Store the Anthropic API key in `.env` as `ANTHROPIC_API_KEY`
4. Define TypeScript types for AI response: `GeneratedAlternative`, `GeneratedPassage`, `GeneratedPrayerPoint`

### Test Thresholds

| #    | Test                                                                                                       | Expected Result                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 5.1  | Call `generateAlternatives()` with mood='Joyful', category='Faith', timeOfDay='Morning', date='2026-06-16' | Returns 3 alternatives                                                          |
| 5.2  | Each alternative has `story_title`, `story_summary`, `reasoning`, `influence_type`                         | All fields present and non-empty                                                |
| 5.3  | Each alternative has `influence_type` of `primary`, `historical`, or `user_directed`                       | Exactly one of each                                                             |
| 5.4  | Each alternative has 2+ passages                                                                           | All passages have `reference`, `passage_text`, `book`, `chapter`, `order_index` |
| 5.5  | Passage references are valid Bible references (spot-check 5)                                               | References resolve to real books/chapters                                       |
| 5.6  | Passage text is non-empty and plausible scripture text                                                     | Not gibberish, not "lorem ipsum"                                                |
| 5.7  | Each alternative has 8-15 prayer points                                                                    | Count within range                                                              |
| 5.8  | Each prayer point has `content` and optionally `passage_ref`                                               | Content is non-empty, actionable sentence                                       |
| 5.9  | Call with `user_notes='I want to learn about Peter'`                                                       | Alternative 3 (user_directed) references Peter                                  |
| 5.10 | Call with empty `user_notes`                                                                               | Alternative 3 is a deeper category exploration                                  |
| 5.11 | Call with date='2026-12-25' (Christmas)                                                                    | Alternative 2 (historical) references Christmas-adjacent history or themes      |
| 5.12 | Call with reading history containing "David's Rise to Kingship"                                            | AI does not return the same story                                               |
| 5.13 | Response is valid JSON parseable into TypeScript types                                                     | No parse errors                                                                 |
| 5.14 | Call completes within 30 seconds                                                                           | No timeout                                                                      |

**Pass criteria:** All 14 tests pass. AI output is structured, valid, and respects constraints.

---

## Stage 6: Alternative Reuse System

**Goal:** Build the reuse logic that queries unpicked alternatives from previous sessions and reuses them when mood + category match exactly. Verify the pick/unpick lifecycle.

### Implementation

1. Create `src/lib/server/reuse.ts`:
   - `findReusableAlternatives(userId, mood, category)` — queries unpicked alternatives where parent session's mood + category match exactly, returns max 2
   - `copyAlternativeToSession(originalAltId, newSessionId)` — creates new alternative row with `reused_from` pointing to original, copies passages and prayer points
   - `pickAlternative(alternativeId)` — sets `picked = true`
2. Integrate into the scripture endpoint flow

### Test Thresholds

| #    | Test                                                                                                                      | Expected Result                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 6.1  | Create session A with mood='Joyful', category='Faith', 3 alternatives (all `picked=false`)                                | Session + alternatives created                                                            |
| 6.2  | Call `findReusableAlternatives(userId, 'Joyful', 'Faith')`                                                                | Returns up to 2 unpicked alternatives from session A                                      |
| 6.3  | Call `findReusableAlternatives(userId, 'Anxious', 'Faith')`                                                               | Returns 0 (mood mismatch)                                                                 |
| 6.4  | Call `findReusableAlternatives(userId, 'Joyful', 'Love')`                                                                 | Returns 0 (category mismatch)                                                             |
| 6.5  | Call `copyAlternativeToSession(altId, newSessionId)`                                                                      | New alternative row created with `reused_from = altId`, passages and prayer points copied |
| 6.6  | Verify copied alternative has new `id` and `session_id` but same `story_title`, `story_summary`                           | Content identical, IDs different                                                          |
| 6.7  | Verify copied passages have new `id` and `alternative_id` pointing to the new alternative                                 | Passages linked correctly                                                                 |
| 6.8  | Verify copied prayer points have new `id` and `alternative_id` pointing to the new alternative                            | Prayer points linked correctly                                                            |
| 6.9  | Call `pickAlternative(copiedAltId)`                                                                                       | `picked` set to `true` on the copied row                                                  |
| 6.10 | Verify original alternative row is unchanged (`picked` still `false`)                                                     | Original untouched                                                                        |
| 6.11 | Call `findReusableAlternatives()` again — picked alternative should NOT appear                                            | Picked alternative excluded                                                               |
| 6.12 | Create 5 sessions with same mood+category, each with 3 unpicked alternatives                                              | 15 unpicked alternatives exist                                                            |
| 6.13 | Call `findReusableAlternatives()`                                                                                         | Returns max 2 (not all 15)                                                                |
| 6.14 | Verify the 2 returned are the most recent                                                                                 | Ordered by `created_at` DESC                                                              |
| 6.15 | Full lifecycle: create session → reuse 2 alternatives → generate 1 fresh → pick 1 → verify remaining 2 are still reusable | Lifecycle works end-to-end                                                                |

**Pass criteria:** All 15 tests pass. Reuse lifecycle is correct. No data leaks between original and copied alternatives.

---

## Stage 7: SvelteKit API Endpoints

**Goal:** Wire all backend modules into SvelteKit API routes and form actions. Verify end-to-end request/response flow.

### Implementation

1. Create `src/routes/api/scripture/+server.ts` — POST handler:
   - Accepts: mood, category, timeOfDay, timeOfYear, currentDate, userNotes
   - Calls reuse logic → AI generation → stores session → returns session ID
2. Create `src/routes/+page.server.ts` — load function (quote selection) + form action (submit inputs)
3. Create `src/routes/session/[id]/+page.server.ts` — load session data + form actions (pick alternative, save comment, mark verses, bookmark)
4. Create `src/routes/history/+page.server.ts` — load history data

### Test Thresholds

| #    | Test                                                          | Expected Result                                                       |
| ---- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| 7.1  | POST to `/api/scripture` with valid inputs                    | Returns session ID, session created in DB with 3 alternatives         |
| 7.2  | POST to `/api/scripture` with missing mood                    | Returns 400 error                                                     |
| 7.3  | POST to `/api/scripture` with missing category                | Returns 400 error                                                     |
| 7.4  | POST to `/api/scripture` while unauthenticated                | Returns 401                                                           |
| 7.5  | GET `/session/{id}` load function                             | Returns session with all alternatives, passages, prayer points        |
| 7.6  | GET `/session/{id}` for another user's session                | Returns 404 or empty (RLS)                                            |
| 7.7  | POST form action: pick alternative                            | Alternative `picked` set to `true`                                    |
| 7.8  | POST form action: save comment                                | Comment row created                                                   |
| 7.9  | POST form action: mark verses as read                         | `verses_read` rows created                                            |
| 7.10 | POST form action: bookmark session                            | Bookmark row created                                                  |
| 7.11 | GET `/history` load function                                  | Returns session timeline, streak, total verses, category distribution |
| 7.12 | GET `/` load function                                         | Returns motivational quote, user profile                              |
| 7.13 | POST to `/api/scripture` with reusable alternatives available | Reuses up to 2, generates remaining fresh                             |
| 7.14 | POST to `/api/scripture` with no reusable alternatives        | Generates all 3 fresh                                                 |

**Pass criteria:** All 14 tests pass. All endpoints return correct status codes and data shapes.

---

## Stage 8: MCP Server

**Goal:** Implement the MCP Streamable HTTP endpoint with all tool definitions. Verify external LLM access to app data.

### Implementation

1. Create `src/lib/server/mcp/server.ts` — MCP server definition
2. Create `src/lib/server/mcp/tools.ts` — All tool handlers:
   - `get_reading_history`
   - `get_passages_read`
   - `get_comments`
   - `get_usage_metrics`
   - `get_session_details`
   - `get_quote_history`
   - `get_alternatives_by_type`
   - `get_unpicked_alternatives`
3. Create `src/routes/api/mcp/+server.ts` — Streamable HTTP transport

### Test Thresholds

| #    | Test                                                            | Expected Result                                                 |
| ---- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 8.1  | MCP endpoint responds to initialization request                 | Valid MCP protocol response                                     |
| 8.2  | Call `get_reading_history` tool                                 | Returns recent sessions with alternatives                       |
| 8.3  | Call `get_passages_read` tool                                   | Returns verse references grouped by session                     |
| 8.4  | Call `get_comments` tool                                        | Returns comments linked to sessions                             |
| 8.5  | Call `get_usage_metrics` tool                                   | Returns streak, totals, distribution                            |
| 8.6  | Call `get_session_details` with valid session ID                | Returns full session with alternatives, passages, prayer points |
| 8.7  | Call `get_quote_history` tool                                   | Returns quote log with dates                                    |
| 8.8  | Call `get_alternatives_by_type` with `influence_type='primary'` | Returns only primary alternatives                               |
| 8.9  | Call `get_unpicked_alternatives` with mood + category           | Returns matching unpicked alternatives                          |
| 8.10 | All tool responses are scoped to the authenticated user         | No cross-user data leakage                                      |
| 8.11 | Invalid tool name                                               | Returns error, does not crash                                   |
| 8.12 | MCP endpoint while unauthenticated                              | Returns 401                                                     |

**Pass criteria:** All 12 tests pass. MCP protocol compliance verified. Data scoping confirmed.

---

## Stage 9: Frontend — Layout + Theme + Welcome Page

**Goal:** Build the Roman Empire theme, global layout, welcome header, and quote display. Verify visual rendering.

### Implementation

1. Update `src/app.html` — Google Fonts (Cinzel, Cormorant Garamond, IM Fell English)
2. Update `src/routes/layout.css` — Tailwind theme tokens (colors, fonts, parchment background)
3. Update `src/routes/+layout.svelte` — Nav bar, parchment background, font application
4. Create `src/lib/components/ui/Button.svelte`
5. Create `src/lib/components/ui/Card.svelte`
6. Create `src/lib/components/ui/ScrollCard.svelte`
7. Create `src/lib/components/WelcomeHeader.svelte`
8. Create `src/lib/components/QuoteDisplay.svelte`
9. Wire `+page.svelte` to display welcome header + quote

### Test Thresholds

| #    | Test                                                  | Expected Result                                |
| ---- | ----------------------------------------------------- | ---------------------------------------------- |
| 9.1  | `pnpm dev` starts without errors                      | No build/type errors                           |
| 9.2  | Navigate to `/` (authenticated)                       | Page renders with "Welcome {username}!" header |
| 9.3  | Header uses Cinzel font                               | Verified in browser dev tools                  |
| 9.4  | Quote displays with verse text and citation           | Quote visible, citation shown                  |
| 9.5  | Background is parchment-colored (#F5E6C8)             | Verified in dev tools                          |
| 9.6  | Text uses Dark Brown (#3E2723) or Ink Black (#1A1A1A) | Readable contrast                              |
| 9.7  | Navigate to `/` (unauthenticated)                     | Redirect to `/auth/login`                      |
| 9.8  | Login page renders with Roman theme                   | Consistent styling                             |
| 9.9  | `pnpm check` passes                                   | No Svelte or TypeScript errors                 |
| 9.10 | `pnpm lint` passes                                    | No lint errors                                 |

**Pass criteria:** All 10 tests pass. Theme is consistent. No build errors.

---

## Stage 10: Frontend — Input Form

**Goal:** Build the input form with searchable mood/category dropdowns, auto-detected time display, additional notes textarea, and form submission.

### Implementation

1. Create `src/lib/components/ui/SearchableDropdown.svelte`
2. Create `src/lib/components/ui/Input.svelte`
3. Create `src/lib/components/ui/TextArea.svelte`
4. Create `src/lib/components/InputForm.svelte`
5. Create `src/lib/utils/time.ts` — time of day detection, date formatting
6. Wire form submission to `/api/scripture` endpoint
7. Add loading state during AI processing

### Test Thresholds

| #     | Test                                                               | Expected Result                                   |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------- |
| 10.1  | Form renders with all fields (mood, category, time, notes, submit) | All fields visible                                |
| 10.2  | Mood dropdown is searchable — type "joy"                           | Filters to Joyful and similar options             |
| 10.3  | Category dropdown is searchable — type "faith"                     | Filters to Faith and similar options              |
| 10.4  | Time of day auto-detected and displayed                            | Shows correct time period                         |
| 10.5  | Today's date displayed (read-only)                                 | Shows current date                                |
| 10.6  | Additional notes textarea accepts free text                        | Text input works                                  |
| 10.7  | Submit button labeled "Open the Scroll"                            | Correct label                                     |
| 10.8  | Submit with valid inputs                                           | Loading state shown, redirects to `/session/{id}` |
| 10.9  | Submit without mood selected                                       | Form validation prevents submission               |
| 10.10 | Submit without category selected                                   | Form validation prevents submission               |
| 10.11 | Submit with empty additional notes                                 | Succeeds (notes are optional)                     |
| 10.12 | `pnpm check` passes                                                | No errors                                         |

**Pass criteria:** All 12 tests pass. Form validates correctly. Submission triggers backend flow.

---

## Stage 11: Frontend — Session Results + Alternatives UI

**Goal:** Build the session results page with alternative cards, passage display, prayer points, comment box, verse tracker, and pick action.

### Implementation

1. Create `src/lib/components/AlternativeCard.svelte` — summary card with badges, expand/collapse, pick button
2. Create `src/lib/components/PassageDisplay.svelte` — parchment card for scripture text
3. Create `src/lib/components/PrayerPoints.svelte` — prayer points list with passage references
4. Create `src/lib/components/CommentBox.svelte` — optional post-session comment
5. Create `src/lib/components/VerseTracker.svelte` — per-verse checkboxes
6. Create `src/routes/session/[id]/+page.svelte` — compose all components
7. Wire pick action, comment save, verse marking, bookmarking

### Test Thresholds

| #     | Test                                                                  | Expected Result                                      |
| ----- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| 11.1  | Navigate to `/session/{id}`                                           | Page renders with 3 alternative cards                |
| 11.2  | Each card shows: story title, summary, passage count, influence badge | All elements visible                                 |
| 11.3  | Reused alternative shows "Previously offered" badge                   | Badge visible on reused alternatives                 |
| 11.4  | Click an alternative card                                             | Card expands, shows passages + prayer points         |
| 11.5  | Passages displayed in narrative order on parchment cards              | Correct order, styled correctly                      |
| 11.6  | Prayer points displayed with passage references                       | References shown alongside each point                |
| 11.7  | AI reasoning section is collapsible                                   | Click to expand/collapse                             |
| 11.8  | Click "Pick this alternative" button                                  | Button triggers action, alternative marked as picked |
| 11.9  | Comment box accepts text and saves                                    | Comment saved to DB                                  |
| 11.10 | Comment box left empty and submitted                                  | No error, no comment created                         |
| 11.11 | Verse tracker shows checkboxes for verses in selected alternative     | Checkboxes rendered per verse                        |
| 11.12 | Check a verse checkbox                                                | `verses_read` row created                            |
| 11.13 | Click bookmark button                                                 | Bookmark row created                                 |
| 11.14 | `pnpm check` passes                                                   | No errors                                            |

**Pass criteria:** All 14 tests pass. Full session results flow works end-to-end.

---

## Stage 12: Frontend — History + Metrics Page

**Goal:** Build the history page with session timeline, reading streak, total verses, category distribution, and quote history.

### Implementation

1. Create `src/lib/components/HistoryTimeline.svelte`
2. Create `src/routes/history/+page.svelte`
3. Wire to history load function data

### Test Thresholds

| #    | Test                                                                         | Expected Result               |
| ---- | ---------------------------------------------------------------------------- | ----------------------------- |
| 12.1 | Navigate to `/history`                                                       | Page renders                  |
| 12.2 | Session timeline shows past sessions with date, story titles, mood, category | Data displayed correctly      |
| 12.3 | Reading streak counter shows correct count                                   | Matches DB calculation        |
| 12.4 | Total verses read shows correct count                                        | Matches `verses_read` count   |
| 12.5 | Category distribution shows breakdown                                        | Visual or list representation |
| 12.6 | Quote history shows past quotes with dates                                   | Data from `quote_logs`        |
| 12.7 | Click a past session                                                         | Navigates to `/session/{id}`  |
| 12.8 | Empty history (new user)                                                     | Shows appropriate empty state |
| 12.9 | `pnpm check` passes                                                          | No errors                     |

**Pass criteria:** All 9 tests pass. History page reflects actual DB data.

---

## Stage 13: Integration + Polish

**Goal:** End-to-end integration test of the complete user flow. Fix any remaining issues. Polish the UI.

### Test Thresholds

| #     | Test                                                                                                                               | Expected Result                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 13.1  | Full flow: login → see welcome + quote → fill form → submit → see 3 alternatives → pick one → add comment → mark verses → bookmark | Entire flow completes without errors |
| 13.2  | Full flow with reusable alternatives: repeat same mood+category → see "Previously offered" badges                                  | Reuse system works in UI             |
| 13.3  | Full flow with additional notes: "I want to learn about Peter" → Alternative 3 is Peter-focused                                    | User-directed alternative works      |
| 13.4  | Visit history page after multiple sessions                                                                                         | All sessions visible in timeline     |
| 13.5  | MCP endpoint returns correct data after multiple sessions                                                                          | All tools functional                 |
| 13.6  | `pnpm build` succeeds                                                                                                              | Production build completes           |
| 13.7  | `pnpm check` passes                                                                                                                | No errors                            |
| 13.8  | `pnpm lint` passes                                                                                                                 | No lint errors                       |
| 13.9  | Responsive: test on mobile viewport (375px)                                                                                        | Layout adapts, cards stack           |
| 13.10 | Contrast audit: all text readable against parchment background                                                                     | No contrast failures                 |

**Pass criteria:** All 10 tests pass. App is production-ready.

---

## Stage Summary

| Stage     | Focus                | Tests   | Backend/Frontend |
| --------- | -------------------- | ------- | ---------------- |
| 1         | Schema + Drizzle     | 20      | Backend          |
| 2         | Auth + RLS           | 14      | Backend          |
| 3         | Bible API            | 8       | Backend          |
| 4         | Quote Engine         | 11      | Backend          |
| 5         | AI Story Selection   | 14      | Backend          |
| 6         | Alternative Reuse    | 15      | Backend          |
| 7         | API Endpoints        | 14      | Backend          |
| 8         | MCP Server           | 12      | Backend          |
| 9         | Layout + Theme       | 10      | Frontend         |
| 10        | Input Form           | 12      | Frontend         |
| 11        | Session Results      | 14      | Frontend         |
| 12        | History + Metrics    | 9       | Frontend         |
| 13        | Integration + Polish | 10      | Both             |
| **Total** |                      | **163** |                  |
