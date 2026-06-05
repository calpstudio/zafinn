-- ================================================
-- ZAFINN - Fase 7: Metas Financeiras
-- Execute no Supabase Dashboard > SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS goals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  target     NUMERIC(12,2) NOT NULL,
  saved      NUMERIC(12,2) DEFAULT 0,
  deadline   DATE,
  emoji      TEXT DEFAULT '🎯',
  color      TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_own" ON goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
