# Database Migrations

This folder contains PostgreSQL migrations that are reviewed separately from runtime schema declarations. The custom authentication migration is intentionally non-destructive because the state of the earlier `email_verifications` table is unknown. Existing plaintext verification rows are never used by the hardened flow, but they should be removed in a later cleanup after the deployed schema is confirmed.

## Files

- To find the existing Supabase RLS policy setup visit [0000_rls_policies.sql](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/drizzle/0000_rls_policies.sql).
- To find the database-backed session, OTP, and rate-limit tables visit [0001_custom_auth.sql](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/drizzle/0001_custom_auth.sql).
- To find the users auth columns migration visit [0002_users_auth_columns.sql](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/drizzle/0002_users_auth_columns.sql).

## Decisions

The migration enables RLS on all authentication tables without public policies. Application access uses the private server database connection. The compatibility columns avoid destructive assumptions about whether an earlier schema push occurred.

The users auth columns migration is additive because the live table predates the auth rewrite. Its email unique index also backs the ON CONFLICT target used when verification completes.

The PostgreSQL migration system can be found in [drizzle.config.ts](file:///C:/PROJECTS/Scripture%20Fetcher/Frontend/drizzle.config.ts).
