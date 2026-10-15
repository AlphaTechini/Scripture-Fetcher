# Confirmed Project Decisions

## Authentication

- Use custom email and password authentication rather than Supabase Auth.
- Store opaque session token hashes in PostgreSQL so sessions can be revoked.
- Send signup OTPs through Resend and fail closed when email is not configured or delivery fails.
- Store OTPs as keyed HMAC digests and bind verification actions to an opaque browser flow token.
- OTP lifetime is 10 minutes with a maximum of 5 verification attempts.
- Resend cooldown is 60 seconds.
- Allow at most 5 OTP emails per address and 10 per client IP during a one-hour window.
- New passwords require at least 8 characters. Existing account passwords remain valid.
- Enforce resource ownership in server queries because custom authentication does not populate Supabase `auth.uid()`.

## Migration Tradeoff

The database state for the earlier plaintext `email_verifications` schema is unknown. Authentication migrations must remain non-destructive until that state is confirmed. Legacy rows and columns may remain temporarily, but runtime code must never read or write plaintext OTPs.

## AI Generation

- Use the Anthropic Messages API with `claude-haiku-5-5`.
- Guarantee the JSON response shape with structured outputs (`output_config.format` JSON schema); keep the JSON cleanup and exactly-three-alternatives validation as defense-in-depth.
- Deploy on Vercel using the Node.js runtime and the native server-side `fetch` API. Do not add an AI client SDK.
- Store the API key in `ANTHROPIC_API_KEY`; do not retain other AI provider credentials or dependencies.
- Send no sampling parameters; `claude-haiku-5-5` rejects non-default `temperature`, `top_p`, and any `top_k`.
- Read the answer from response content blocks of type `text`; adaptive thinking blocks precede them.
