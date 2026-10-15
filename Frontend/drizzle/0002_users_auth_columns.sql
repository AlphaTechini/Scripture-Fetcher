-- users predates the custom auth flow in this database, so schema.ts's auth columns are added here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;

-- completeEmailVerification targets email in ON CONFLICT DO NOTHING, which needs this index.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (email);
