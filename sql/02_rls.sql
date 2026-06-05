-- ================================================
-- ZAFINN — Row Level Security (RLS)
-- Arquivo 2 de 3: Segurança por linha
-- Execute este arquivo APÓS o 01_schema.sql
-- ================================================
-- RLS garante que cada usuário veja APENAS os próprios dados.
-- Mesmo que alguém descubra a chave pública do Supabase,
-- não consegue ler dados de outro usuário.
-- ================================================

-- ------------------------------------------------
-- Habilitar RLS em todas as tabelas
-- ------------------------------------------------
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks    ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------
-- PROFILES
-- ------------------------------------------------
CREATE POLICY "profile_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profile_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------
CREATE POLICY "categories_all" ON categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- SUBCATEGORIES
-- ------------------------------------------------
CREATE POLICY "subcategories_all" ON subcategories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- BANK_ACCOUNTS
-- ------------------------------------------------
CREATE POLICY "bank_accounts_all" ON bank_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- CARDS
-- ------------------------------------------------
CREATE POLICY "cards_all" ON cards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------
CREATE POLICY "transactions_all" ON transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- BUDGET_ITEMS
-- ------------------------------------------------
CREATE POLICY "budget_items_all" ON budget_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- ASSETS
-- ------------------------------------------------
CREATE POLICY "assets_all" ON assets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- DEBTS
-- ------------------------------------------------
CREATE POLICY "debts_all" ON debts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- FUTURE_ITEMS
-- ------------------------------------------------
CREATE POLICY "future_items_all" ON future_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- ATTACHMENTS
-- ------------------------------------------------
CREATE POLICY "attachments_all" ON attachments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- BENCHMARKS
-- ------------------------------------------------
CREATE POLICY "benchmarks_all" ON benchmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
