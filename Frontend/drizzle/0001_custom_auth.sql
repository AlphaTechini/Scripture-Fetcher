CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- These nullable columns keep this migration compatible if the earlier plaintext table was pushed.
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS email_key text;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS code_hash text;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS flow_token_hash text;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS last_sent_at timestamp with time zone;
ALTER TABLE email_verifications ALTER COLUMN code SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS email_verifications_email_key_unique
  ON email_verifications (email_key);
CREATE UNIQUE INDEX IF NOT EXISTS email_verifications_flow_token_hash_unique
  ON email_verifications (flow_token_hash);
CREATE INDEX IF NOT EXISTS email_verifications_email_idx
  ON email_verifications (email);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_unique
  ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_started_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_expires_at_idx
  ON auth_rate_limits (expires_at);

-- Server-only auth tables are not exposed through Supabase's public API roles.
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
