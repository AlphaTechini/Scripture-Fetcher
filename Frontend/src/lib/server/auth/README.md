# Authentication Modules

This folder implements custom email and password authentication. Browser cookies contain opaque random tokens only. Session and verification token hashes are stored in PostgreSQL, while OTPs are stored as keyed HMAC digests.

## Files

- To find token generation and keyed hashing visit [crypto.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/crypto.ts).
- To find password validation and bcrypt handling visit [password.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/password.ts).
- To find OTP lifecycle and atomic account creation visit [verification.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/verification.ts).
- To find verification email rendering visit [verification-email.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/verification-email.ts).
- To find database-backed send throttling visit [rate-limit.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/rate-limit.ts).
- To find the confirmed security thresholds visit [policy.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/policy.ts).
- To find server-side email normalization visit [input.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth/input.ts).

## Decisions

Database sessions add a query to authenticated requests but make logout and server-side revocation effective. OTP attempts are serialized with a PostgreSQL row lock so one code cannot be consumed concurrently. Email and IP send limits are persisted because in-memory limits are unreliable on serverless deployments.

The session cookie system can be found in [auth.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/src/lib/server/auth.ts).
