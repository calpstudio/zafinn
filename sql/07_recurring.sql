-- ================================================
-- ZAFINN: Tabela de Templates Recorrentes / Parcelamentos
-- Execute este arquivo no SQL Editor do Supabase
-- ================================================

CREATE TABLE IF NOT EXISTS recurring_templates (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description         TEXT NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category_id         UUID REFERENCES categories(id),
  account_name        TEXT,
  day_of_month        INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  kind                TEXT NOT NULL CHECK (kind IN ('recurring', 'installment')),
  total_installments  INTEGER,
  start_month         TEXT NOT NULL,
  last_created_month  TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_own" ON recurring_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
