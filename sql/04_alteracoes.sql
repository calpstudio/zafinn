-- ================================================
-- ZAFINN — Fase 3: Alterações no Schema
-- Execute no Supabase SQL Editor
-- ================================================

-- Adiciona campo account_name em transactions
-- (o app usa texto livre para conta/cartão por enquanto)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_name TEXT;
