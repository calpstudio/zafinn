-- ================================================
-- ZAFINN - Módulo: Cartões de Crédito e Faturas
-- Execute no Supabase Dashboard > SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS credit_cards (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  closing_day  INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 28),
  due_day      INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  limit_amount NUMERIC(12,2),
  color        TEXT DEFAULT '#5DD62C',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards_own" ON credit_cards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
