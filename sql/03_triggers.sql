-- ================================================
-- ZAFINN — Triggers e Funções Automáticas
-- Arquivo 3 de 3: Automações do banco
-- Execute este arquivo APÓS o 02_rls.sql
-- ================================================

-- ================================================
-- TRIGGER: Ao criar conta, cria automaticamente:
-- 1. Perfil do usuário
-- 2. Categorias padrão
-- 3. Gabarito financeiro padrão
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN

  -- 1. Criar perfil
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- 2. Criar categorias padrão de RECEITA
  INSERT INTO categories (user_id, name, type, emoji, color, bg_color, is_default) VALUES
    (NEW.id, 'Salário',          'income',  '💼', '#059669', '#ECFDF5', true),
    (NEW.id, 'Pró-labore',       'income',  '🏢', '#059669', '#ECFDF5', true),
    (NEW.id, 'Renda Extra',      'income',  '✨', '#7C3AED', '#F5F3FF', true),
    (NEW.id, 'Aluguéis',         'income',  '🏘️', '#059669', '#ECFDF5', true),
    (NEW.id, 'Investimentos',    'income',  '💰', '#059669', '#ECFDF5', true),
    (NEW.id, 'Outras Receitas',  'income',  '🎁', '#059669', '#ECFDF5', true);

  -- 3. Criar categorias padrão de DESPESA
  INSERT INTO categories (user_id, name, type, emoji, color, bg_color, is_default) VALUES
    (NEW.id, 'Moradia',      'expense', '🏠', '#3B82F6', '#EFF6FF', true),
    (NEW.id, 'Alimentação',  'expense', '🍕', '#F59E0B', '#FFFBEB', true),
    (NEW.id, 'Transporte',   'expense', '🚗', '#8B5CF6', '#F5F3FF', true),
    (NEW.id, 'Saúde',        'expense', '❤️', '#EC4899', '#FDF2F8', true),
    (NEW.id, 'Lazer',        'expense', '🎉', '#14B8A6', '#F0FDFA', true),
    (NEW.id, 'Educação',     'expense', '📚', '#6366F1', '#EEF2FF', true),
    (NEW.id, 'Cartões',      'expense', '💳', '#F97316', '#FFF7ED', true),
    (NEW.id, 'Dívidas',      'expense', '📋', '#DC2626', '#FEF2F2', true),
    (NEW.id, 'Assinaturas',  'expense', '📱', '#06B6D4', '#ECFEFF', true),
    (NEW.id, 'Impostos',     'expense', '🧾', '#84CC16', '#F7FEE7', true),
    (NEW.id, 'Vestuário',    'expense', '👗', '#D946EF', '#FDF4FF', true),
    (NEW.id, 'Animais',      'expense', '🐾', '#92400E', '#FEF3C7', true),
    (NEW.id, 'Presentes',    'expense', '🎀', '#BE185D', '#FDF2F8', true),
    (NEW.id, 'Outros',       'expense', '📦', '#78716C', '#F5F5F4', true);

  -- 4. Criar gabarito financeiro padrão (percentuais ideais)
  INSERT INTO benchmarks (user_id, category_name, min_pct, max_pct) VALUES
    (NEW.id, 'Moradia',      20, 30),
    (NEW.id, 'Alimentação',  10, 20),
    (NEW.id, 'Transporte',    5, 15),
    (NEW.id, 'Saúde',         5, 10),
    (NEW.id, 'Lazer',         5, 10),
    (NEW.id, 'Educação',      5, 10),
    (NEW.id, 'Investimentos', 10, 20),
    (NEW.id, 'Vestuário',     2,  5),
    (NEW.id, 'Assinaturas',   2,  5);

  RETURN NEW;
END;
$$;

-- Vincula a função ao evento de criação de usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_transactions ON transactions;
CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_assets ON assets;
CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_debts ON debts;
CREATE TRIGGER set_updated_at_debts
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================
-- STORAGE: Bucket para arquivos/anexos
-- Execute separado no Supabase Dashboard > Storage
-- ================================================
-- Não é possível criar buckets via SQL.
-- Crie manualmente um bucket chamado "attachments"
-- com as seguintes configurações:
--   • Nome: attachments
--   • Público: NÃO (privado)
--   • Tamanho máximo: 50MB
--   • Tipos permitidos: pdf, png, jpg, jpeg, csv
-- ================================================
