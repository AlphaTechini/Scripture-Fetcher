-- Enable RLS on all user-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verses_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_logs ENABLE ROW LEVEL SECURITY;

-- motivational_quotes is public (no RLS needed)

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Sessions table policies
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Alternatives table policies (accessed via sessions)
CREATE POLICY "Users can view alternatives via own sessions"
  ON alternatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = alternatives.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create alternatives via own sessions"
  ON alternatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = alternatives.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update alternatives via own sessions"
  ON alternatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = alternatives.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete alternatives via own sessions"
  ON alternatives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = alternatives.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Passages table policies (accessed via alternatives -> sessions)
CREATE POLICY "Users can view passages via own sessions"
  ON passages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = passages.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create passages via own sessions"
  ON passages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = passages.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete passages via own sessions"
  ON passages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = passages.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Prayer points table policies (accessed via alternatives -> sessions)
CREATE POLICY "Users can view prayer points via own sessions"
  ON prayer_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = prayer_points.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create prayer points via own sessions"
  ON prayer_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = prayer_points.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prayer points via own sessions"
  ON prayer_points FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM alternatives
      JOIN sessions ON sessions.id = alternatives.session_id
      WHERE alternatives.id = prayer_points.alternative_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Comments table policies
CREATE POLICY "Users can view own comments"
  ON comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comments on own sessions"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = comments.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Verses read table policies
CREATE POLICY "Users can view own verses read"
  ON verses_read FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own verses read"
  ON verses_read FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own verses read"
  ON verses_read FOR DELETE
  USING (auth.uid() = user_id);

-- Bookmarks table policies
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Quote logs table policies
CREATE POLICY "Users can view own quote logs"
  ON quote_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quote logs"
  ON quote_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, translation)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'KJV'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
