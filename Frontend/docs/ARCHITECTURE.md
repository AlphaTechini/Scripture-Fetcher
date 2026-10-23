# Architecture — Scripture Fetcher

## Overview

Scripture Fetcher is a fullstack SvelteKit application that serves as a personal Bible study companion. It uses Anthropic Claude Haiku 5.5 to surface **complete Bible stories** — not isolated passages — based on the user's mood, chosen category, temporal context, and personal notes. Each study session returns **multiple alternatives**, each representing a full narrative that may span multiple chapters or even multiple books. The AI also generates prayer points for each alternative. Repetition is avoided through database-backed history tracking.

The entire application adopts a Roman Empire scholarly aesthetic: parchment textures, scroll metaphors, ink-style typography, and classical serif fonts.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Welcome  │  │ Input     │  │ Session Results      │  │
│  │ + Quote  │  │ Form      │  │ (3 Alternatives)     │  │
│  └────┬─────┘  └─────┬─────┘  └──────────┬───────────┘  │
│       │               │                   │              │
└───────┼───────────────┼───────────────────┼──────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                  SvelteKit Server (Vercel)               │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Quote      │  │ Scripture  │  │ MCP Endpoint      │  │
│  │ Selector   │  │ Endpoint   │  │ (Streamable HTTP) │  │
│  └─────┬──────┘  └─────┬──────┘  └────────┬──────────┘  │
│        │               │                   │             │
│  ┌─────▼───────────────▼───────────────────▼──────────┐  │
│  │              Server-Side Modules                    │  │
│  │  ┌──────┐  ┌──────┐  ┌────────┐  ┌─────────────┐  │  │
│  │  │ db   │  │ ai   │  │ bible  │  │ mcp/server  │  │  │
│  │  └──┬───┘  └──┬───┘  └───┬────┘  └──────┬──────┘  │  │
│  └─────┼──────────┼──────────┼──────────────┼─────────┘  │
└────────┼──────────┼──────────┼──────────────┼────────────┘
         │          │          │              │
         ▼          ▼          ▼              ▼
┌──────────────┐ ┌───────────┐ ┌──────────┐
│  Supabase    │ │ Anthropic │ │ API.Bible│
│  (Postgres)  │ │    API    │ │           │
└──────────────┘ └───────────┘ └──────────┘
```

---

## Core Systems

### 1. Authentication (Supabase Auth)

Supabase Auth handles user identity from day one. Email/password or OAuth (Google).

- User sessions are validated in `+layout.server.ts` via Supabase SSR helpers.
- The user's display name (from their Supabase profile) populates the welcome header: `Welcome {username}!`
- All database queries are scoped to the authenticated user via Row Level Security (RLS).

**Key files:**

- To find **auth setup** visit [+layout.server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/+layout.server.ts)
- To find **login page** visit [auth/login/+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/auth/login/+page.svelte)
- To find **auth callback** visit [auth/callback/+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/auth/callback/+server.ts)

---

### 2. Welcome Page & Quote Engine

The welcome page is the landing experience. It displays:

1. **Large header:** `Welcome {username}!` — classical serif font (Cinzel).
2. **Motivational quote:** A verified Bible verse, randomly selected from a pre-seeded pool in the database. Never AI-generated — this eliminates hallucination risk entirely.
3. **Quote citation:** e.g., `— Philippians 4:13`
4. **Subtext:** Smaller (but readable) description: "A random verse to inspire your Bible study."

**Quote selection logic:**

- The `motivational_quotes` table stores ~150-200 pre-seeded, verified Bible verses.
- Each quote is tagged with `mood_tags`, `category_tags`, and `season_tags`.
- On page load, `quotes.ts` selects a quote weighted by the current time of day, season, and the user's recent quote history (to avoid showing the same quote too frequently).
- Every quote shown is logged to `quote_logs` with a timestamp — this doubles as the usage metrics source.

**Key files:**

- To find **quote selection logic** visit [quotes.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/quotes.ts)
- To find **quote display component** visit [QuoteDisplay.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/QuoteDisplay.svelte)

---

### 3. Input Form

The input form collects context that the AI uses to select complete Bible stories. Fields:

| Field                | Type                | Behavior                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mood**             | Searchable dropdown | Many options (Joyful, Anxious, Grateful, Weary, Hopeful, Confused, Angry, Peaceful, Lonely, Courageous, Tempted, Grieving, Celebrating, Doubtful, Determined, Restless, Content, Overwhelmed, etc.). Search bar for filtering.                                                                                                                             |
| **Category**         | Searchable dropdown | Many options (Faith, Love, Wisdom, Strength, Forgiveness, Purpose, Patience, Humility, Justice, Mercy, Hope, Salvation, Prayer, Worship, Discipleship, Prophecy, Creation, End Times, Relationships, Leadership, Suffering, Joy, Peace, etc.). Search bar for filtering.                                                                                   |
| **Time of Day**      | Auto-detected       | Derived from client's local time: Morning (5-11), Afternoon (12-16), Evening (17-20), Night (21-4). Not user-editable.                                                                                                                                                                                                                                     |
| **Time of Year**     | Auto-detected       | Current date passed to AI. The AI uses this to factor in liturgical/seasonal context (Christmas, Easter, Lent, Advent, New Year, etc.).                                                                                                                                                                                                                    |
| **Today's Date**     | Auto-detected       | Passed to AI so it can reference historical events that happened on this day in church history, world history (not Bible-specific), or the biblical calendar, and surface related scriptures.                                                                                                                                                              |
| **Additional Notes** | Optional textarea   | Free-form text where the user can express specific interests. Examples: "I want to learn more about Mary," "Tell me about Peter's journey," "Something about overcoming fear." When provided, this input heavily influences Alternative 3 (User-Directed). When empty, Alternative 3 falls back to a deeper exploration of the selected category and mood. |

**Key files:**

- To find **input form component** visit [InputForm.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/InputForm.svelte)
- To find **time detection utility** visit [time.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/utils/time.ts)

---

### 4. AI Story Selection (Alternatives System)

This is the core intelligence. The AI does **not** select isolated passages. It identifies **complete Bible stories** — narratives that may span multiple chapters or multiple books — and returns **three alternatives**, each influenced by different inputs.

**When the user submits the input form, the server:**

1. **Queries DB for unpicked alternatives** — Filters `alternatives` where `picked = false` AND the parent session's `mood` and `category` exactly match the current request. Maximum 2 candidates are selected for reuse.
2. **Fetches reading history** — Filters `alternatives` + `passages` scoped to the current `category` (and `mood`). Only history relevant to the current request is sent to the AI. This reduces DB reads and keeps the AI prompt focused.
3. **Determines how many fresh alternatives to generate** — If 2 unpicked alternatives were found, generate 1 fresh. If 1 was found, generate 2. If 0, generate all 3.
4. **Constructs a detailed system prompt** (for the fresh alternatives only) containing:
   - User's selected mood, category, additional notes
   - Time of day, time of year, today's date
   - Reading history summary (stories to avoid, topics recently covered, books already read) — scoped to the current category
   - Instructions for the AI's alternative generation logic (see below)
5. **Looks up a historical fact** with a small Claude Haiku 5.5 call using the web search tool (max 3 searches) to confirm an "on this day" event. Failure falls back to model knowledge.
6. **Calls Anthropic Claude Haiku 5.5** with structured outputs (only for the fresh alternatives). The Historical Context summary opens with the confirmed fact and its source.
7. **Combines reused + fresh alternatives** into a single set of 3.
8. **Server stores the session** (with all alternatives, passages, and prayer points) in the DB. All alternatives start with `picked = false`.

#### Alternative Reuse Rules

- **Eligibility:** An unpicked alternative is eligible for reuse only if its parent session's `mood` AND `category` exactly match the current request.
- **Maximum reuse:** At most 2 alternatives can be reused from previous sessions. At least 1 fresh alternative is always generated.
- **Selection order:** When multiple unpicked alternatives match, prefer the most recent ones (they're more likely to reflect the user's current reading trajectory).
- **Reused alternatives retain their original data** — story title, summary, passages, prayer points, and reasoning are carried over as-is. They are not regenerated or modified.
- **Reused alternatives are linked to the new session** — A new row is created in `alternatives` for the new session, with the same content but a new `id` and `session_id`. The original row remains untouched for audit trail purposes.
- **Once picked, an alternative is consumed** — It cannot be reused again. The `picked` flag is set to `true` on the new row (not the original).

#### The Three Alternatives

Each session returns exactly three alternatives. They are differentiated by **what influenced them most**:

**Alternative 1 — Primary (Category + Mood Driven)**

- The main recommendation, heavily influenced by the selected **category** and **mood**.
- The AI identifies a complete Bible story that best matches the user's emotional state and chosen category.
- Reading history is the primary constraint: if the category has stories not yet covered, pick a new one. If most stories under the category have been explored, revisit the same theme with a different narrative.
- Time of day and time of year serve as secondary modifiers (e.g., morning → energizing story, Christmas season → incarnation narrative).

**Alternative 2 — Historical Context (Date Driven)**

- Heavily influenced by **today's date** and what happened on this day in history.
- The AI relates its historical knowledge of significant events on this date — in church history, world history, or the biblical calendar.
- It then identifies a Bible story whose themes connect to that historical event.
- Example: If today is the anniversary of Martin Luther King Jr.'s "I Have a Dream" speech, the AI might surface the story of Moses leading the Israelites (liberation narrative) or Amos's call for justice.
- This alternative is always different from Alternative 1 — it prioritizes the historical connection over the category/mood match.

**Alternative 3 — User-Directed (Notes Driven)**

- Heavily influenced by the user's **additional notes** (if provided).
- If the user wrote "I want to learn more about Mary," this alternative surfaces a complete story arc involving Mary (e.g., the Annunciation through Pentecost — Luke 1, Luke 2, John 2, John 19, Acts 1).
- If no notes are provided, this alternative becomes a **deeper category exploration** — a story that goes deeper into the selected category from a different angle than Alternative 1.
- This alternative always prioritizes the user's explicit interest over the category/mood defaults.

#### Story Composition Rules

Each alternative is a **complete story**, not a single passage. The AI follows these rules:

- **Identify the narrative arc**: Every Bible story has a beginning, middle, and end. The AI must include all key passages that form the complete narrative.
- **Span multiple chapters when needed**: A story like "David and Goliath" includes 1 Samuel 17, but a story like "David's Rise to Kingship" might include 1 Samuel 16-31 + 2 Samuel 1-5.
- **Cross book boundaries when thematically linked**: A story about "Peter's Transformation" could include Matthew 14 (walking on water), Matthew 16 (confession), Matthew 26 (denial), John 21 (restoration), Acts 2 (Pentecost sermon), and 1 Peter 1 (his own letter reflecting on faith).
- **Group by content relatedness**: If passages from different chapters or books share closely related themes, events, or characters within the same narrative, they belong in the same alternative. The metric is: would a reader feel the story is incomplete without this passage?
- **Maintain narrative order**: Passages within an alternative are ordered chronologically (as they appear in the biblical narrative), not by canonical order.
- **Minimum 2 passages, no hard maximum**: A story must include at least 2 distinct passage references. Complex stories may include 5-10+ passages.

#### AI Decision Logic (instructed via system prompt)

- Check the user's reading history before selecting any story.
- If the selected category has stories not yet covered → pick a new story under that category.
- If most stories under the category have been covered → revisit the same theme with a different narrative angle.
- If the exact story was recently read → select a different one.
- Factor in time of year (e.g., Christmas → incarnation narratives, Lent → sacrifice/redemption arcs).
- Factor in today's date for Alternative 2 (historical events → thematically connected Bible stories).
- Factor in time of day (e.g., morning → commissioning/calling stories, night → rest/trust narratives).
- When additional notes are provided, Alternative 3 must directly address the user's stated interest.

#### Passage Text Retrieval

- Primary: Anthropic Claude Haiku 5.5 generates the requested passage text from its model knowledge. The generation route does not invoke API.Bible, and web search is used only for the historical fact lookup, never for passage text.
- The AI is instructed to provide accurate, verifiable scripture text with book/chapter/verse references for every passage in every alternative.
- No server-side validation layer — generated passage text should be independently verified before being treated as authoritative.

**Key files:**

- To find **AI orchestration** visit [ai.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/ai.ts)
- To find **Bible API integration** visit [bible.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/bible.ts)
- To find **scripture API endpoint** visit [api/scripture/+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/api/scripture/+server.ts)

---

### 5. Prayer Point Generation

Generated by the same Anthropic call as the story selection (single round-trip). Since each alternative is a full story spanning multiple passages, prayer points are generated **per alternative** and are more numerous than a single-passage approach would warrant.

The system prompt instructs the AI to:

- Generate **8-15 prayer points per alternative**, scaled to the story's depth and passage count.
- Prayer points should trace the narrative arc of the story — opening points reflect the story's beginning, middle points engage with the conflict or turning point, closing points draw from the resolution.
- Each prayer point should be **personal, actionable, and grounded in a specific passage** within the alternative. The AI should reference which passage each prayer point draws from.
- Format: short declarative sentences the user can pray aloud.
- If the story spans multiple books, prayer points should draw connections across the books (e.g., "Lord, like Peter who denied You but was restored, help me trust in Your grace when I fail").

Prayer points are stored in the `prayer_points` table, linked to each alternative.

---

### 6. Session Results Page

After the AI returns, the user sees a page organized around the **three alternatives**, presented as expandable scroll cards.

1. **Alternative tabs/cards** — Three cards displayed side-by-side (or stacked on mobile), each showing:
   - **Label**: "Primary", "Historical Context", or "Your Interest" (for user-directed).
   - **Story title**: e.g., "David's Rise to Kingship" or "Peter's Journey from Denial to Pentecost."
   - **Story summary**: 2-3 sentence overview of the narrative arc.
   - **Passage count**: e.g., "5 passages across 3 books."
   - **Influence badge**: What drove this alternative (category/mood, historical date, or user notes).
   - **Reuse badge**: If the alternative was reused from a previous session, a subtle "Previously offered" indicator is shown.
2. **Expanded alternative view** — When the user selects an alternative, it unfurls to show:
   - **Full passage texts** — Each passage displayed on its own parchment card, in narrative order. Book/chapter/verse reference clearly shown.
   - **Prayer points** — 8-15 points listed below the passages, each referencing which passage it draws from. Ink-style formatting.
   - **AI reasoning** (collapsible) — Why this story was chosen and how it connects to the user's inputs.
3. **"Pick this alternative" button** — Explicit action that marks the alternative as `picked = true` in the DB. Once picked, the alternative is consumed and cannot be reused in future sessions. The other two alternatives remain unpicked and available for reuse when conditions match.
4. **Post-session comment box** (optional) — Text area to add personal reflections after reading. Saved to the `comments` table linked to the session. Separate from the initial "Additional Notes" input.
5. **Verse tracker** — Checkboxes per verse (or verse range) across all passages in the selected alternative, to mark as "read." Stored in `verses_read` table.
6. **Bookmark button** — Save the entire session (all alternatives) for later review.

**Key files:**

- To find **session results page** visit [session/[id]/+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/session/[id]/+page.svelte)
- To find **alternative card component** visit [AlternativeCard.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/AlternativeCard.svelte)
- To find **passage display** visit [PassageDisplay.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/PassageDisplay.svelte)
- To find **prayer points** visit [PrayerPoints.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/PrayerPoints.svelte)
- To find **comment box** visit [CommentBox.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/CommentBox.svelte)
- To find **verse tracker** visit [VerseTracker.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/VerseTracker.svelte)

---

### 7. History & Metrics

Accessible via navigation. Displays:

- **Session timeline** — Chronological list of past sessions with date, stories covered (all 3 alternatives), mood, and category.
- **Reading streak** — Consecutive days the user has engaged with the app.
- **Total verses read** — Aggregate count from `verses_read`.
- **Category distribution** — Visual breakdown of which categories the user has explored most.
- **Quote history** — Log of all motivational quotes shown, with dates.
- **Revisit past sessions** — Click any session to re-read all alternatives, prayer points, and comments.

**Key files:**

- To find **history page** visit [history/+page.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/history/+page.svelte)
- To find **history timeline component** visit [HistoryTimeline.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/HistoryTimeline.svelte)

---

### 8. MCP Server (Streamable HTTP)

An MCP (Model Context Protocol) endpoint that allows external LLMs to query the app's database. Implemented as SvelteKit API routes — no separate process needed.

**Transport:** MCP over Streamable HTTP at `/api/mcp`.

**Exposed tools:**

| Tool                        | Description                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `get_reading_history`       | Returns the user's recent sessions with all alternatives (story titles, passages, mood, category, date)                     |
| `get_passages_read`         | Returns all verse references the user has marked as read, grouped by session and alternative                                |
| `get_comments`              | Returns post-session comments the user has written, linked to sessions                                                      |
| `get_usage_metrics`         | Returns streak, total sessions, total alternatives explored, total verses, category distribution                            |
| `get_session_details`       | Returns full details of a specific session: all 3 alternatives, their passages, prayer points, and reasoning                |
| `get_quote_history`         | Returns the log of motivational quotes shown to the user                                                                    |
| `get_alternatives_by_type`  | Returns all alternatives filtered by influence type (primary, historical, user_directed)                                    |
| `get_unpicked_alternatives` | Returns unpicked alternatives for a given mood + category combination (used internally for reuse logic and exposed via MCP) |

**Key files:**

- To find **MCP server definition** visit [mcp/server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/mcp/server.ts)
- To find **MCP tool handlers** visit [mcp/tools.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/mcp/tools.ts)
- To find **MCP HTTP endpoint** visit [api/mcp/+server.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/routes/api/mcp/+server.ts)

---

## Data Model

```sql
-- Users (managed by Supabase Auth, extended profile in public schema)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT 'KJV',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-seeded motivational quotes (verified Bible verses only)
CREATE TABLE motivational_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_reference TEXT NOT NULL,
  verse_text      TEXT NOT NULL,
  mood_tags       TEXT[] DEFAULT '{}',
  category_tags   TEXT[] DEFAULT '{}',
  season_tags     TEXT[] DEFAULT '{}'
);

-- Log of every quote shown to a user (powers usage metrics)
CREATE TABLE quote_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id),
  quote_id  UUID NOT NULL REFERENCES motivational_quotes(id),
  shown_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bible study sessions (one per form submission)
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  mood              TEXT NOT NULL,
  category          TEXT NOT NULL,
  time_of_day       TEXT NOT NULL,
  time_of_year      TEXT NOT NULL,
  current_date_text TEXT NOT NULL,
  user_notes        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Story alternatives (3 per session, each a complete Bible story)
CREATE TABLE alternatives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  influence_type  TEXT NOT NULL CHECK (influence_type IN ('primary', 'historical', 'user_directed')),
  story_title     TEXT NOT NULL,
  story_summary   TEXT NOT NULL,
  reasoning       TEXT,
  picked          BOOLEAN NOT NULL DEFAULT false,
  reused_from     UUID REFERENCES alternatives(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual passages within an alternative (2+ per alternative)
CREATE TABLE passages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alternative_id  UUID NOT NULL REFERENCES alternatives(id) ON DELETE CASCADE,
  reference       TEXT NOT NULL,
  passage_text    TEXT NOT NULL,
  book            TEXT NOT NULL,
  chapter         TEXT NOT NULL,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- Prayer points per alternative (8-15 per alternative)
CREATE TABLE prayer_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alternative_id  UUID NOT NULL REFERENCES alternatives(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  passage_ref     TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- User comments on sessions (optional, post-reading reflections)
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verses the user has marked as "read"
CREATE TABLE verses_read (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  alternative_id  UUID REFERENCES alternatives(id) ON DELETE SET NULL,
  verse_reference TEXT NOT NULL,
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookmarked sessions
CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

All tables have Row Level Security (RLS) policies scoped to `auth.uid() = user_id`.

---

## Complete User Flow (End-to-End)

```
1. USER VISITS APP
   ├─ Server checks Supabase session in +layout.server.ts
   ├─ If unauthenticated → redirect to /auth/login
   └─ If authenticated → load user profile, proceed to home

2. HOME PAGE (/)
   ├─ Welcome header: "Welcome {username}!" (Cinzel font, large)
   ├─ Motivational quote from pre-seeded pool
   │   ├─ Selected by quotes.ts based on time + recent history
   │   ├─ Logged to quote_logs with timestamp
   │   └─ Displayed with citation (e.g., "— Philippians 4:13")
   ├─ Subtext: "A random verse to inspire your Bible study."
   └─ Input form below

3. INPUT FORM
   ├─ Mood selector (searchable dropdown, many options)
   ├─ Category picker (searchable dropdown, many options)
   ├─ Time of day (auto-detected, displayed but not editable)
   ├─ Time of year + today's date (auto-detected, passed to AI)
   ├─ Additional Notes (optional textarea — "I want to learn about...")
   └─ Submit button: "Open the Scroll"

4. AI PROCESSING (server-side, via /api/scripture)
   ├─ Query DB for unpicked alternatives where mood + category match
   │   ├─ If 2 found → reuse both, generate 1 fresh
   │   ├─ If 1 found → reuse it, generate 2 fresh
   │   └─ If 0 found → generate all 3 fresh
   ├─ Fetch reading history (filtered by current category + mood only)
   ├─ Construct system prompt for fresh alternatives:
   │   ├─ Mood, category, additional notes, time of day, time of year, today's date
   │   ├─ Reading history (stories to avoid, topics covered, books read)
   │   ├─ Instructions for 3 alternatives:
   │   │   ├─ Alt 1: Primary (category + mood driven)
   │   │   ├─ Alt 2: Historical Context (today's date driven)
   │   │   └─ Alt 3: User-Directed (notes driven, or deeper category exploration)
   │   ├─ Story composition rules (complete narratives, multi-chapter, cross-book)
   │   └─ Prayer point generation instructions (8-15 per alternative)
   ├─ Call Anthropic Claude Haiku 5.5 with structured outputs (fresh alternatives only)
   ├─ Combine reused + fresh alternatives into set of 3
   ├─ Store session + alternatives + passages + prayer points in DB
   │   (all alternatives start with picked = false)
   └─ Redirect to /session/{id}

5. SESSION RESULTS PAGE (/session/[id])
   ├─ Three alternative cards displayed (Primary, Historical, Your Interest)
   │   ├─ Each shows: story title, summary, passage count, influence badge
   │   ├─ Reused alternatives show a "Previously offered" badge
   │   └─ User selects one to expand and read
   ├─ Expanded alternative:
   │   ├─ All passages displayed in narrative order (parchment cards)
   │   ├─ Prayer points (8-15) with passage references
   │   ├─ AI reasoning (collapsible)
   │   └─ Verse tracker (checkboxes per verse across all passages)
   ├─ "Pick this alternative" button — marks alternative as picked
   │   (picked = true in DB, unpicked alternatives remain available for reuse)
   ├─ Post-session comment box (optional reflection)
   └─ Bookmark button

6. HISTORY & METRICS (/history)
   ├─ Session timeline (date, stories covered, mood, category)
   ├─ Reading streak counter
   ├─ Total verses read
   ├─ Category distribution
   ├─ Quote history log
   └─ Click any session to revisit all alternatives + comments

7. MCP ENDPOINT (/api/mcp)
   ├─ External LLMs connect via Streamable HTTP
   ├─ Query tools: reading history, passages read, comments, metrics
   └─ All queries scoped to authenticated user
```

---

## Technology Decisions

### Why Fullstack SvelteKit

The app's complexity doesn't warrant separate frontend and backend services. SvelteKit API routes handle all server-side logic (AI calls, DB queries, MCP endpoint) in a single deployable unit on Vercel. This simplifies auth, reduces latency, and eliminates CORS concerns.

### Why Anthropic Native Fetch

Claude Haiku 5.5 exposes the Messages API over plain HTTP. Native `fetch` works in the Vercel Node.js runtime and avoids an additional production SDK.

### Structured AI Output

Anthropic structured outputs (`output_config.format` JSON schema) guarantee schema-valid JSON. The existing prompt still defines the response structure and the server still validates that exactly three alternatives are returned before storing them.

### Why API.Bible (Starter Plan)

- Free tier: 5,000 API calls/month — sufficient for personal use.
- Includes 3 copyrighted translations + all open-access Bibles.
- Clean REST API for fetching passages by reference.
- API.Bible remains available for a future server-side passage verification integration.

### Why Pre-Seeded Quotes (Not AI-Generated)

The user identified quote hallucination as the toughest risk. Pre-seeding ~150-200 verified Bible verses into the `motivational_quotes` table eliminates this entirely. The AI never generates quotes — it only selects from verified data. The pool can grow over time.

### Why MCP over Streamable HTTP (Not a Separate Process)

MCP servers don't need to be long-running WebSocket processes. The Streamable HTTP transport allows MCP to be implemented as standard HTTP endpoints — which SvelteKit API routes handle natively. This means the MCP server deploys alongside the app on Vercel with zero additional infrastructure.

### Why Supabase

- Postgres for relational data (users → sessions → alternatives → passages → prayer_points).
- Built-in Auth (email/password + OAuth).
- Row Level Security for per-user data isolation.
- Free tier is generous for personal use.
- Pooler connection string with `sslmode=require` for IPv4 compatibility.

---

## Theme & Design System

### Aesthetic

Roman Empire scholarly feel. The entire site — not just individual components — should feel like an ancient manuscript or scroll. Parchment textures, ink-style borders, classical typography.

### Typography

| Usage                  | Font                   | Weight      |
| ---------------------- | ---------------------- | ----------- |
| Headers, titles        | **Cinzel**             | 600-700     |
| Body text, passages    | **Cormorant Garamond** | 400-600     |
| Quote italics, accents | **IM Fell English**    | 400, italic |

All fonts loaded via Google Fonts in `app.html`.

### Color Palette

| Token      | Hex       | Usage                     |
| ---------- | --------- | ------------------------- |
| Parchment  | `#F5E6C8` | Page background           |
| Dark Brown | `#3E2723` | Primary text              |
| Ink Black  | `#1A1A1A` | Headers, emphasis         |
| Gold       | `#C9A84C` | Accents, buttons, borders |
| Aged Red   | `#8B2500` | Highlights, links         |
| Aged Paper | `#E8D5B7` | Card backgrounds          |

### UI Metaphors

- Form submit button: "Open the Scroll"
- Passage cards: Parchment sheet styling with subtle grain texture
- Scroll unfurl animation on passage reveal (CSS transition)
- Ink-style borders and dividers
- Buttons styled as wax seals or classical tabs

---

## Environment Variables

All secrets are stored in `.env` (gitignored).

```
DATABASE_URL=
SESSION_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
API_BIBLE_KEY=
```

---

## Deployment

- **Adapter:** `@sveltejs/adapter-vercel` (not `adapter-auto`)
- **Platform:** Vercel
- **MCP endpoint:** Deployed as part of the same Vercel app at `/api/mcp`

---

## Implementation

This project is built in 13 sequential stages, each with defined test thresholds that must pass before proceeding. Backend is implemented before frontend.

- [Implementation Stages](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/stages.md) — All stages with test thresholds
- [Verification Methods](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/docs/verification.md) — How each stage is verified

---

## Future Improvements

- **Streaming AI responses** — Critical given the volume of content (3 alternatives × multiple passages × 8-15 prayer points each). Stream each alternative as it's generated so the user can start reading while the rest loads.
- **Offline support** — Service worker to cache recent sessions for offline reading.
- **Shareable passages** — Generate image cards (parchment-styled) for sharing on social media.
- **Liturgical calendar integration** — More granular seasonal awareness (Advent, Lent, Pentecost, etc.).
- **Multi-language support** — Bible passages in the user's preferred language via API.Bible's translation catalog.
