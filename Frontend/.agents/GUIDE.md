# Confirmed Project Decisions

## Authentication

- Use custom email and password authentication rather than Supabase Auth.
- Store opaque session token hashes in PostgreSQL so sessions can be revoked.
- Send signup OTPs through Resend from the fixed verified sender `Scripture Fetcher <noreply@cyberpunkinc.xyz>` and fail closed when `RESEND_API_KEY` is missing or delivery fails.
- Store OTPs as keyed HMAC digests and bind verification actions to an opaque browser flow token.
- OTP lifetime is 10 minutes with a maximum of 5 verification attempts.
- Resend cooldown is 60 seconds.
- Allow at most 5 OTP emails per address and 10 per client IP during a one-hour window.
- New passwords require at least 8 characters. Existing account passwords remain valid.
- Enforce resource ownership in server queries because custom authentication does not populate Supabase `auth.uid()`.

## Migration Tradeoff

The database state for the earlier plaintext `email_verifications` schema is unknown. Authentication migrations must remain non-destructive until that state is confirmed. Legacy rows and columns may remain temporarily, but runtime code must never read or write plaintext OTPs.

## Deployment

- Pushes to `auth-and-anthropic` build preview deployments server-side through the GitHub integration. Production ships with `vercel deploy --prod` from a clean tree, which re-anchors `scripture-fetcher.vercel.app` reliably.
- Do not use `vercel promote` here: for this git-connected project it builds from the production branch and wedges the domain alias, leaving the edge answering `NOT_FOUND` while `alias set` reports success without sticking.
- When the Vercel CLI fails with `fetch failed`, `UND_ERR_CONNECT_TIMEOUT`, or `ECONNRESET` on large uploads (observed here for TLS 1.3 handshakes and big request bodies), run it with `NODE_OPTIONS=--tls-max-v1.2`. Small CLI calls like `env ls` and `inspect` keep working.

## AI Generation

- Use the Anthropic Messages API with `claude-haiku-5-5`.
- Guarantee the JSON response shape with structured outputs (`output_config.format` JSON schema); keep the JSON cleanup and exactly-three-alternatives validation as defense-in-depth.
- Deploy on Vercel using the Node.js runtime and the native server-side `fetch` API. Do not add an AI client SDK.
- Store the API key in `ANTHROPIC_API_KEY`; do not retain other AI provider credentials or dependencies.
- Send no sampling parameters; `claude-haiku-5-5` rejects non-default `temperature`, `top_p`, and any `top_k`.
- Read the answer from response content blocks of type `text`; adaptive thinking blocks precede them.
- The historical fact comes from a separate web-search call (`web_search_20250305`, max 3 searches) before generation, never from web search inside the structured-output call. The lookup must never fail the session; on error it returns null and generation falls back to model knowledge.
- Mood and the user's own notes steer the Primary alternative, not only the category name.
