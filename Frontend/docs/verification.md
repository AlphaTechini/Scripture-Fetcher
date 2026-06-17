# Verification Methods

This document defines **how** each stage's test thresholds are verified. Tests are not unit test files — they are actual queries, API calls, CLI commands, and browser interactions executed manually or via scripts to confirm correctness.

Each verification method maps to the test thresholds in [stages.md](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/stages.md).

---

## General Verification Tools

| Tool | Purpose |
|------|---------|
| `drizzle-kit studio` | Visual DB browser — verify tables, data, relations |
| `drizzle-kit push` | Sync schema to DB — verify no migration errors |
| Supabase Dashboard | Verify RLS policies, auth users, table data |
| SvelteKit dev server (`pnpm dev`) | Verify pages render, API routes respond |
| `curl` / `httpie` / Thunder Client | Test API endpoints directly |
| Browser DevTools | Verify fonts, colors, layout, network requests |
| `pnpm check` | Svelte + TypeScript type checking |
| `pnpm lint` | ESLint + Prettier formatting check |
| `pnpm build` | Production build verification |

---

## Stage 1: Schema + Drizzle Setup

### Verification Method

After pushing the schema with `pnpm db:push`, execute a **verification script** (`src/lib/server/db/verify.ts`) that performs all 20 CRUD operations in sequence using the Drizzle client. The script:

1. Inserts test data into every table in dependency order (users → sessions → alternatives → passages → prayer_points → comments → verses_read → bookmarks → motivational_quotes → quote_logs)
2. Queries back each inserted row to confirm it was stored correctly
3. Tests the CHECK constraint on `alternatives.influence_type` by attempting an invalid insert and expecting an error
4. Tests CASCADE delete by deleting a session and verifying all child rows are removed
5. Tests the category-scoped query: `SELECT alternatives.* FROM alternatives JOIN sessions ON ... WHERE sessions.mood = 'Joyful' AND sessions.category = 'Faith'`
6. Tests ordering: passages and prayer_points ordered by `order_index`
7. Prints PASS/FAIL for each test with the actual vs expected values
8. Cleans up all test data at the end

**Run command:** `pnpm tsx src/lib/server/db/verify.ts`

**Pass condition:** All 20 tests print PASS. Script exits with code 0.

---

## Stage 2: Supabase Auth + RLS Policies

### Verification Method

1. **Auth flow tests (2.1–2.3, 2.13–2.14):**
   - Use the SvelteKit dev server and browser
   - Sign up via the login page → check Supabase Dashboard for new user in `auth.users` and `users` table
   - Sign in → verify redirect to `/` and welcome header shows username
   - Visit `/` in incognito (no session) → verify redirect to `/auth/login`
   - Sign out → verify redirect to `/auth/login`

2. **RLS tests (2.4–2.12):**
   - Create two test users (User A, User B) via Supabase Auth
   - Use a **verification script** (`src/lib/server/auth/verify-rls.ts`) that:
     - Authenticates as User A, inserts a session, queries sessions → expects 1 row
     - Authenticates as User B, queries sessions → expects 0 rows
     - Repeats for alternatives (via session JOIN), comments, verses_read
     - Attempts cross-user comment insert → expects error
   - Alternatively, use Supabase SQL Editor with `SET ROLE authenticated` and `SET request.jwt.claims` to simulate different users

3. **RLS policy audit:**
   - In Supabase Dashboard → Authentication → Policies, verify each table has RLS enabled
   - Verify policy expressions reference `auth.uid() = user_id` (or session ownership chain)

**Run command:** `pnpm tsx src/lib/server/auth/verify-rls.ts`

**Pass condition:** All 14 tests pass. RLS blocks all cross-user access. No auth bypass.

---

## Stage 3: Bible API Integration

### Verification Method

Execute a **verification script** (`src/lib/server/bible/verify.ts`) that:

1. Calls `fetchPassage('John 3:16', 'KJV')` → logs the response, verifies `passage_text` contains "For God so loved the world"
2. Calls `fetchPassage('Romans 8:28-30', 'KJV')` → verifies multi-verse text
3. Calls `fetchPassage('1 Samuel 17', 'KJV')` → verifies full chapter returned
4. Calls `fetchPassage('Genesis 1:1-31', 'KJV')` → verifies 31 verses
5. Calls `fetchPassage('FakeBook 1:1', 'KJV')` → verifies error returned (not crash)
6. Calls with invalid API key → verifies auth error (not crash)
7. Calls 10 passages in sequence → verifies all succeed
8. Checks response shape: `book`, `chapter`, `reference`, `passage_text` all present and typed

**Run command:** `pnpm tsx src/lib/server/bible/verify.ts`

**Pass condition:** All 8 tests pass. No unhandled exceptions.

---

## Stage 4: Quote Engine

### Verification Method

1. **Seed verification (4.1–4.4, 4.11):**
   - After running the seed script, query `motivational_quotes` count → expect ≥150
   - Query with array contains operators for mood, category, season tags → verify results
   - Query for empty `verse_text` or `verse_reference` → expect 0 rows

2. **Selection logic verification (4.5–4.10):**
   - Execute a **verification script** (`src/lib/server/quotes/verify.ts`) that:
     - Calls `selectQuote()` for a test user with no history → logs the returned quote
     - Calls `selectQuote()` 10 times → logs all returned quote IDs → verifies no single ID appears more than 3 times (reasonable distribution)
     - Calls `logQuote()` → queries `quote_logs` to verify row exists
     - Calls with different `timeOfDay` and `season` values → verifies quotes are returned

3. **Spot-check:**
   - Manually verify 10 random quotes from the seed data against a Bible (e.g., bible-api.com) to confirm they are real verses

**Run command:** `pnpm tsx src/lib/server/quotes/verify.ts`

**Pass condition:** All 11 tests pass. Seed data verified as authentic.

---

## Stage 5: AI Story Selection + Prayer Points

### Verification Method

Execute a **verification script** (`src/lib/server/ai/verify.ts`) that:

1. Calls `generateAlternatives()` with various input combinations
2. For each call, validates the response structure:
   - Exactly 3 alternatives returned
   - Each has `influence_type` of `primary`, `historical`, or `user_directed` (one each)
   - Each has `story_title` (non-empty string), `story_summary` (non-empty), `reasoning` (non-empty)
   - Each has 2+ passages with valid `reference`, `passage_text`, `book`, `chapter`, `order_index`
   - Each has 8-15 prayer points with non-empty `content`
3. Spot-checks 5 passage references against API.Bible to confirm they're real
4. Tests with `user_notes='I want to learn about Peter'` → verifies Alternative 3 mentions Peter
5. Tests with empty `user_notes` → verifies Alternative 3 is category-focused
6. Tests with `date='2026-12-25'` → verifies Alternative 2 has historical/Christmas connection
7. Tests with reading history containing a known story → verifies AI doesn't repeat it
8. Validates JSON parsing into TypeScript types (no parse errors)
9. Measures response time → must be under 30 seconds

**Run command:** `pnpm tsx src/lib/server/ai/verify.ts`

**Pass condition:** All 14 tests pass. AI output is structured and valid.

---

## Stage 6: Alternative Reuse System

### Verification Method

Execute a **verification script** (`src/lib/server/reuse/verify.ts`) that:

1. Creates test data: multiple sessions with known mood/category combinations and unpicked alternatives
2. Tests `findReusableAlternives()` with exact match → expects results
3. Tests with mood mismatch → expects 0 results
4. Tests with category mismatch → expects 0 results
5. Tests `copyAlternativeToSession()` → verifies new row has new IDs but same content, passages and prayer points copied
6. Tests `pickAlternative()` → verifies `picked = true` on copied row, original unchanged
7. Tests that picked alternatives are excluded from future reuse queries
8. Tests max-2 cap: creates 5 sessions with 15 unpicked alternatives → verifies only 2 returned
9. Tests recency: verifies the 2 returned are the most recently created
10. Full lifecycle test: create → reuse → generate fresh → pick → verify remaining reusable

**Run command:** `pnpm tsx src/lib/server/reuse/verify.ts`

**Pass condition:** All 15 tests pass. Lifecycle is correct.

---

## Stage 7: SvelteKit API Endpoints

### Verification Method

Use `curl` (or Thunder Client in VS Code) against the running dev server:

1. **Scripture endpoint (7.1–7.4, 7.13–7.14):**
   ```
   curl -X POST http://localhost:5173/api/scripture \
     -H "Content-Type: application/json" \
     -H "Cookie: <auth-session-cookie>" \
     -d '{"mood":"Joyful","category":"Faith","timeOfDay":"Morning","timeOfYear":"Summer","currentDate":"2026-06-16"}'
   ```
   - Verify response contains session ID
   - Query DB to confirm session + 3 alternatives + passages + prayer points created
   - Test with missing fields → expect 400
   - Test without auth cookie → expect 401

2. **Page load functions (7.5–7.6, 7.11–7.12):**
   - Navigate to pages in browser with DevTools Network tab open
   - Verify `__data.json` responses contain expected data shapes
   - Test accessing another user's session → expect 404/empty

3. **Form actions (7.7–7.10):**
   - Submit forms in browser → verify DB rows created via Supabase Dashboard or `drizzle-kit studio`

**Pass condition:** All 14 tests pass. Correct HTTP status codes and data shapes.

---

## Stage 8: MCP Server

### Verification Method

1. **Protocol compliance (8.1, 8.11–8.12):**
   - Send MCP initialization request to `/api/mcp`:
     ```
     curl -X POST http://localhost:5173/api/mcp \
       -H "Content-Type: application/json" \
       -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
     ```
   - Verify valid MCP response
   - Send invalid tool name → verify error response
   - Send without auth → verify 401

2. **Tool verification (8.2–8.10):**
   - For each tool, send a `tools/call` request with appropriate parameters
   - Verify response data matches DB contents
   - Verify data is scoped to authenticated user (create data for 2 users, verify only own data returned)

**Pass condition:** All 12 tests pass. MCP protocol compliant.

---

## Stage 9: Frontend — Layout + Theme + Welcome Page

### Verification Method

1. **Build verification (9.1, 9.9–9.10):**
   ```
   pnpm dev
   pnpm check
   pnpm lint
   ```

2. **Visual verification (9.2–9.8):**
   - Open `http://localhost:5173` in browser
   - Verify "Welcome {username}!" renders with Cinzel font (check DevTools → Computed → font-family)
   - Verify quote displays with verse text and citation
   - Verify background color is `#F5E6C8` (DevTools → element → background-color)
   - Verify text color is `#3E2723` or `#1A1A1A`
   - Visit in incognito → verify redirect to `/auth/login`
   - Verify login page has consistent Roman theme styling

**Pass condition:** All 10 tests pass. Theme is visually consistent.

---

## Stage 10: Frontend — Input Form

### Verification Method

1. **Component rendering (10.1–10.7):**
   - Open home page in browser
   - Verify all form fields render
   - Type in mood dropdown search → verify filtering
   - Type in category dropdown search → verify filtering
   - Verify time of day and date display
   - Verify submit button text

2. **Form behavior (10.8–10.11):**
   - Submit with all fields → verify loading state, redirect to session page
   - Submit without mood → verify validation blocks
   - Submit without category → verify validation blocks
   - Submit with empty notes → verify success

3. **Build verification (10.12):**
   ```
   pnpm check
   ```

**Pass condition:** All 12 tests pass.

---

## Stage 11: Frontend — Session Results + Alternatives UI

### Verification Method

1. **Page rendering (11.1–11.7):**
   - Navigate to a session page after a successful submission
   - Verify 3 alternative cards render with correct data
   - Verify "Previously offered" badge on reused alternatives
   - Click each card → verify expansion shows passages + prayer points
   - Verify passages are in narrative order
   - Verify prayer points show passage references
   - Click AI reasoning section → verify collapse/expand

2. **User actions (11.8–11.13):**
   - Click "Pick this alternative" → verify DB update (check via Supabase Dashboard)
   - Type in comment box and save → verify comment row created
   - Leave comment empty and navigate away → verify no error
   - Check verse checkboxes → verify `verses_read` rows created
   - Click bookmark → verify bookmark row created

3. **Build verification (11.14):**
   ```
   pnpm check
   ```

**Pass condition:** All 14 tests pass.

---

## Stage 12: Frontend — History + Metrics Page

### Verification Method

1. **Page rendering (12.1–12.8):**
   - Navigate to `/history` after creating multiple sessions
   - Verify timeline shows sessions with correct data
   - Verify streak counter matches expected count
   - Verify total verses matches `verses_read` count (check via DB query)
   - Verify category distribution renders
   - Verify quote history shows past quotes
   - Click a session → verify navigation to `/session/{id}`
   - Visit as new user with no history → verify empty state

2. **Build verification (12.9):**
   ```
   pnpm check
   ```

**Pass condition:** All 9 tests pass.

---

## Stage 13: Integration + Polish

### Verification Method

1. **End-to-end flow (13.1–13.5):**
   - Perform the complete user flow manually in browser:
     - Login → Welcome page → Fill form → Submit → See alternatives → Pick one → Comment → Mark verses → Bookmark
   - Repeat with same mood+category → verify reuse badges appear
   - Repeat with additional notes → verify user-directed alternative
   - Visit history → verify all sessions visible
   - Test MCP endpoint → verify all tools return data

2. **Build + quality (13.6–13.8):**
   ```
   pnpm build
   pnpm check
   pnpm lint
   ```

3. **Responsive + accessibility (13.9–13.10):**
   - Open DevTools → toggle device toolbar → test at 375px width
   - Verify cards stack, form fields are usable, text is readable
   - Run contrast check: verify all text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text)

**Pass condition:** All 10 tests pass. App is production-ready.

---

## Verification Script Convention

All verification scripts follow this pattern:

```
src/lib/server/
├── db/verify.ts           — Stage 1
├── auth/verify-rls.ts     — Stage 2
├── bible/verify.ts        — Stage 3
├── quotes/verify.ts       — Stage 4
├── ai/verify.ts           — Stage 5
├── reuse/verify.ts        — Stage 6
```

Each script:
- Is run via `pnpm tsx <path>`
- Prints `[PASS]` or `[FAIL]` for each test with actual vs expected
- Exits with code 0 on all pass, code 1 on any failure
- Cleans up test data after execution
- Does NOT create permanent test files in the project (scripts are deleted after stage completion or moved to a `scripts/` directory)
