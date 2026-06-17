# Components (`src/lib/components/`)

All Svelte 5 components used across the application. Components use runes mode (`$state`, `$props`, `$derived`, `$effect`).

## UI Primitives (`ui/`)

Shared, theme-aware building blocks. All styled with Tailwind CSS using the Roman Empire design tokens.

| Component | Purpose |
|-----------|---------|
| `Button.svelte` | Classical tab-style button (parchment + gold accents) |
| `Card.svelte` | Parchment sheet card with subtle grain texture |
| `ScrollCard.svelte` | Card variant with scroll unfurl animation |
| `SearchableDropdown.svelte` | Dropdown with integrated search bar (used for mood and category) |
| `Input.svelte` | Styled text input (ink-on-parchment aesthetic) |
| `TextArea.svelte` | Styled textarea for comments |
| `Badge.svelte` | Small label for mood/category tags |

## Feature Components

| Component | Purpose |
|-----------|---------|
| [WelcomeHeader.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/WelcomeHeader.svelte) | Large "Welcome {username}!" header with Cinzel font |
| [QuoteDisplay.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/QuoteDisplay.svelte) | Motivational quote card with verse citation |
| [InputForm.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/InputForm.svelte) | Full input form — mood, category, time display, additional notes, submit |
| [AlternativeCard.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/AlternativeCard.svelte) | Summary card for one alternative (story title, summary, passage count, influence badge, "Previously offered" badge if reused). Expandable. Contains "Pick this alternative" button. |
| [PassageDisplay.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/PassageDisplay.svelte) | Single scripture passage on parchment card |
| [PrayerPoints.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/PrayerPoints.svelte) | Prayer points list with passage references, ink-style formatting |
| [CommentBox.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/CommentBox.svelte) | Optional post-session comment textarea + save button |
| [VerseTracker.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/VerseTracker.svelte) | Per-verse checkboxes across all passages in an alternative |
| [HistoryTimeline.svelte](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/components/HistoryTimeline.svelte) | Chronological session timeline for history page |

## Design Conventions

- All components use `<script lang="ts">` with Svelte 5 runes.
- Props are declared with `let { prop1, prop2, ... }: Props = $props()`.
- Styling uses Tailwind utility classes with custom theme tokens defined in `layout.css`.
- No inline styles unless required for dynamic values.
- Components are self-contained — no implicit dependencies on parent state.
