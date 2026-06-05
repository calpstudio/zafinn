-- ================================================
-- ZAFINN — Schema do Banco de Dados
-- Arquivo 1 de 3: Criação das Tabelas
-- Execute este arquivo primeiro no Supabase SQL Editor
-- ================================================

-- Habilita extensão para gerar IDs únicos (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABELA: profiles
-- Dados extras do usuário (além do que o Supabase Auth já guarda)
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: categories
-- Categorias financeiras de cada usuário
-- ================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  emoji       TEXT DEFAULT '📦',
  color       TEXT DEFAULT '#78716C',
  bg_color    TEXT DEFAULT '#F5F5F4',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: subcategories
-- Subcategorias vinculadas a uma categoria
-- ================================================
CREATE TABLE IF NOT EXISTS subcategories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: bank_accounts
-- Contas bancárias do usuário
-- ================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  bank_name       TEXT,
  type            TEXT DEFAULT 'checking'
                  CHECK (type IN ('checking','savings','investment','cash','other')),
  initial_balance DECIMAL(15,2) DEFAULT 0,
  color           TEXT DEFAULT '#2563EB',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: cards
-- Cartões de crédito/débito do usuário
-- ================================================
CREATE TABLE IF NOT EXISTS cards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  bank_name    TEXT,
  card_limit   DECIMAL(15,2) DEFAULT 0,
  closing_day  INTEGER CHECK (closing_day BETWEEN 1 AND 31),
  due_day      INTEGER CHECK (due_day BETWEEN 1 AND 31),
  color        TEXT DEFAULT '#7C3AED',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: transactions
-- Lançamentos reais (receitas e despesas)
-- ================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description          TEXT NOT NULL,
  amount               DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  type                 TEXT NOT NULL CHECK (type IN ('income','expense')),
  category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id       UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  account_id           UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  card_id              UUID REFERENCES cards(id) ON DELETE SET NULL,
  date                 DATE NOT NULL,
  year_month           TEXT NOT NULL,     -- YYYY-MM (ex: 2026-06) para filtros rápidos
  notes                TEXT,
  is_recurring         BOOLEAN DEFAULT FALSE,
  recurrence_group_id  UUID,              -- agrupa parcelas de um mesmo lançamento
  installment_number   INTEGER,
  total_installments   INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: budget_items
-- Orçamento planejado por mês
-- ================================================
CREATE TABLE IF NOT EXISTS budget_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month    TEXT NOT NULL,            -- YYYY-MM (ex: 2026-06)
  description   TEXT NOT NULL,
  amount        DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  type          TEXT NOT NULL CHECK (type IN ('income','expense')),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: assets
-- Patrimônio: imóveis, veículos, investimentos, etc.
-- ================================================
CREATE TABLE IF NOT EXISTS assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT DEFAULT 'Outros'
                  CHECK (category IN ('Imóvel','Veículo','Investimento','Empresa','Terreno','Outros')),
  purchase_value  DECIMAL(15,2) DEFAULT 0,
  current_value   DECIMAL(15,2) NOT NULL DEFAULT 0,
  purchase_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: debts
-- Dívidas: financiamentos, empréstimos, consórcios
-- ================================================
CREATE TABLE IF NOT EXISTS debts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  type                    TEXT DEFAULT 'Financiamento'
                          CHECK (type IN ('Financiamento','Empréstimo','Consórcio','Cartão','Outros')),
  total_amount            DECIMAL(15,2) NOT NULL,
  remaining_balance       DECIMAL(15,2) NOT NULL,
  installment_value       DECIMAL(15,2) NOT NULL,
  total_installments      INTEGER NOT NULL,
  remaining_installments  INTEGER NOT NULL,
  start_date              DATE,
  end_date                DATE,
  interest_rate           DECIMAL(6,4),   -- taxa de juros em % (ex: 0.0899 = 8,99% a.a.)
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: future_items
-- Contas a receber e a pagar (parcelas futuras)
-- ================================================
CREATE TABLE IF NOT EXISTS future_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('income','expense')),
  total_value         DECIMAL(15,2) NOT NULL,
  installment_value   DECIMAL(15,2) NOT NULL,
  total_installments  INTEGER NOT NULL DEFAULT 1,
  status              TEXT DEFAULT 'active'
                      CHECK (status IN ('active','completed','cancelled')),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: attachments
-- Arquivos anexados a lançamentos (PDF, imagem, CSV, OFX)
-- ================================================
CREATE TABLE IF NOT EXISTS attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,         -- 'pdf', 'image', 'csv', 'ofx'
  file_path       TEXT NOT NULL,         -- caminho no Supabase Storage
  file_size       INTEGER,               -- tamanho em bytes
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABELA: benchmarks
-- Gabarito financeiro: % ideal por categoria
-- ================================================
CREATE TABLE IF NOT EXISTS benchmarks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name  TEXT NOT NULL,
  min_pct        INTEGER DEFAULT 0 CHECK (min_pct BETWEEN 0 AND 100),
  max_pct        INTEGER DEFAULT 30 CHECK (max_pct BETWEEN 0 AND 100),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_name)         -- cada usuário tem 1 benchmark por categoria
);

-- ================================================
-- ÍNDICES — aceleram buscas frequentes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_month
  ON transactions(user_id, year_month);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_budget_items_user_month
  ON budget_items(user_id, year_month);

CREATE INDEX IF NOT EXISTS idx_categories_user
  ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_assets_user
  ON assets(user_id);

CREATE INDEX IF NOT EXISTS idx_debts_user
  ON debts(user_id);

CREATE INDEX IF NOT EXISTS idx_future_items_user
  ON future_items(user_id, status);
