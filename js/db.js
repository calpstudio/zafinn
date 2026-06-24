/* ================================================
   ZAFINN - Camada de Dados (Supabase)
   Todas as operações de leitura e escrita no banco.
   Mantém state.data sincronizado com o Supabase.
   ================================================ */

const ZDB = (function() {

  let _cats = [];          // [{id, name, type, emoji, color}]
  let _catByName = {};     // name → {id, type, emoji, color}

  /* ---------- Carregar categorias ---------- */
  async function _loadCats() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return;
    const { data } = await _sb.from('categories').select('*').order('name');
    _cats = data || [];
    _catByName = {};
    _cats.forEach(c => { _catByName[c.name] = c; });
  }

  function _catId(name) {
    return _catByName[name]?.id || null;
  }

  function _catList(type) {
    const list = _cats.filter(c => c.type === type || c.type === 'both').map(c => c.name);
    if (list.length > 0) return list;
    return type === 'income'
      ? ['Salário','Pró-labore','Renda Extra','Aluguéis','Investimentos','Outras Receitas']
      : ['Moradia','Alimentação','Transporte','Saúde','Lazer','Educação','Cartões','Dívidas','Assinaturas','Impostos','Investimentos','Vestuário','Animais','Presentes','Outros'];
  }

  /* ================================================
     LOAD: Mês (transações + orçamento)
     ================================================ */
  async function loadMonth(yearMonth) {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return { transactions: [], budget: { incomes: [], expenses: [] } };

    const [txRes, bdRes] = await Promise.all([
      _sb.from('transactions')
        .select('*, categories(name, emoji, color)')
        .eq('user_id', uid)
        .eq('year_month', yearMonth)
        .order('date', { ascending: false }),
      _sb.from('budget_items')
        .select('*, categories(name)')
        .eq('user_id', uid)
        .eq('year_month', yearMonth)
    ]);

    const transactions = (txRes.data || []).map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: parseFloat(t.amount),
      type: t.type,
      category: t.categories?.name || 'Outros',
      account: t.account_name || '',
      notes: t.notes || '',
      yearMonth: t.year_month
    }));

    const incomes = (bdRes.data || [])
      .filter(b => b.type === 'income')
      .map(b => ({ id: b.id, name: b.description, category: b.categories?.name || 'Outros', amount: parseFloat(b.amount) }));

    const expenses = (bdRes.data || [])
      .filter(b => b.type === 'expense')
      .map(b => ({ id: b.id, name: b.description, category: b.categories?.name || 'Outros', amount: parseFloat(b.amount) }));

    return { transactions, budget: { incomes, expenses } };
  }

  /* ================================================
     LOAD: Patrimônio, Dívidas, Fluxo
     ================================================ */
  async function loadAssets() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('assets').select('*').eq('user_id', uid).order('created_at');
    return (data || []).map(a => ({
      id: a.id, name: a.name, category: a.category,
      purchaseDate: a.purchase_date,
      purchaseValue: parseFloat(a.purchase_value || 0),
      currentValue: parseFloat(a.current_value || 0),
      notes: a.notes || ''
    }));
  }

  async function loadDebts() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('debts').select('*').eq('user_id', uid).order('created_at');
    return (data || []).map(d => ({
      id: d.id, name: d.name, type: d.type,
      totalValue: parseFloat(d.total_amount || 0),
      remainingBalance: parseFloat(d.remaining_balance || 0),
      totalInstallments: d.total_installments || 0,
      remainingInstallments: d.remaining_installments || 0,
      installmentValue: parseFloat(d.installment_value || 0),
      startDate: d.start_date || '',
      endDate: d.end_date || ''
    }));
  }

  async function loadFutureItems() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('future_items')
      .select('*').eq('user_id', uid).eq('status', 'active').order('start_date');
    return (data || []).map(f => ({
      id: f.id, description: f.description, type: f.type,
      totalValue: parseFloat(f.total_value || 0),
      totalInstallments: f.total_installments || 1,
      installmentValue: parseFloat(f.installment_value || 0),
      startDate: f.start_date, endDate: f.end_date, status: f.status
    }));
  }

  /* ================================================
     LOAD ALL: Estado completo do app
     ================================================ */
  async function loadAll(currentMonth) {
    await _loadCats();

    const [monthData, assets, debts, futureItems, goals, creditCards, recurringTemplates, accounts] = await Promise.all([
      loadMonth(currentMonth),
      loadAssets(),
      loadDebts(),
      loadFutureItems(),
      loadGoals(),
      loadCreditCards(),
      loadRecurringTemplates(),
      loadAccounts()
    ]);

    return {
      months: { [currentMonth]: monthData },
      assets,
      debts,
      futureItems,
      goals,
      creditCards,
      recurringTemplates,
      accounts,
      accountsWithBalance: null,
      categories: {
        incomes: _catList('income'),
        expenses: _catList('expense')
      },
      benchmarks: {
        'Moradia':       { min: 20, max: 25, emoji: '🏠', color: '#3B82F6' },
        'Alimentação':   { min: 10, max: 15, emoji: '🍕', color: '#F59E0B' },
        'Transporte':    { min: 5,  max: 10, emoji: '🚗', color: '#8B5CF6' },
        'Saúde':         { min: 5,  max: 10, emoji: '❤️', color: '#EC4899' },
        'Lazer':         { min: 5,  max: 10, emoji: '🎉', color: '#14B8A6' },
        'Educação':      { min: 3,  max: 8,  emoji: '📚', color: '#6366F1' },
        'Investimentos': { min: 10, max: 20, emoji: '💰', color: '#10B981' },
        'Assinaturas':   { min: 1,  max: 5,  emoji: '📱', color: '#06B6D4' },
        'Cartões':       { min: 0,  max: 20, emoji: '💳', color: '#F97316' },
        'Outros':        { min: 0,  max: 5,  emoji: '📦', color: '#78716C' }
      }
    };
  }

  /* ================================================
     TRANSACTIONS
     ================================================ */
  async function addTransaction(yearMonth, tx) {
    const uid = ZAuth.getUser()?.id;
    const catId = _catId(tx.category)
      || _catId(tx.type === 'income' ? 'Outras Receitas' : 'Outros')
      || _cats.find(c => c.type === tx.type || c.type === 'both')?.id
      || null;
    const { error } = await _sb.from('transactions').insert({
      id: tx.id,
      user_id: uid,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: catId,
      account_name: tx.account || null,
      date: tx.date,
      year_month: yearMonth,
      notes: tx.notes || null
    });
    if (error) throw new Error('Erro ao salvar transação: ' + error.message);
  }

  async function updateTransaction(yearMonth, tx) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('transactions').update({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: _catId(tx.category),
      account_name: tx.account || null,
      date: tx.date,
      year_month: yearMonth,
      notes: tx.notes || null
    }).eq('id', tx.id).eq('user_id', uid);
    if (error) throw new Error('Erro ao atualizar transação: ' + error.message);
  }

  async function deleteTransaction(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('transactions').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir transação: ' + error.message);
  }

  /* ================================================
     BUDGET ITEMS
     ================================================ */
  async function addBudgetItem(yearMonth, type, item) {
    const uid = ZAuth.getUser()?.id;
    const budgetType = type === 'incomes' ? 'income' : 'expense';
    const { error } = await _sb.from('budget_items').insert({
      id: item.id,
      user_id: uid,
      year_month: yearMonth,
      description: item.name,
      amount: item.amount,
      type: budgetType,
      category_id: _catId(item.category)
    });
    if (error) throw new Error('Erro ao salvar orçamento: ' + error.message);
  }

  async function deleteBudgetItem(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('budget_items').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir item: ' + error.message);
  }

  /* ================================================
     ASSETS
     ================================================ */
  async function addAsset(asset) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('assets').insert({
      id: asset.id,
      user_id: uid,
      name: asset.name,
      category: asset.category,
      purchase_value: asset.purchaseValue || 0,
      current_value: asset.currentValue,
      purchase_date: asset.purchaseDate || null,
      notes: asset.notes || null
    });
    if (error) throw new Error('Erro ao salvar bem: ' + error.message);
  }

  async function deleteAsset(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('assets').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir bem: ' + error.message);
  }

  /* ================================================
     DEBTS
     ================================================ */
  async function addDebt(debt) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('debts').insert({
      id: debt.id,
      user_id: uid,
      name: debt.name,
      type: debt.type,
      total_amount: debt.totalValue,
      remaining_balance: debt.remainingBalance,
      installment_value: debt.installmentValue,
      total_installments: debt.totalInstallments,
      remaining_installments: debt.remainingInstallments,
      start_date: debt.startDate || null,
      end_date: debt.endDate || null
    });
    if (error) throw new Error('Erro ao salvar dívida: ' + error.message);
  }

  async function deleteDebt(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('debts').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir dívida: ' + error.message);
  }

  /* ================================================
     FUTURE ITEMS
     ================================================ */
  async function addFutureItem(item) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('future_items').insert({
      id: item.id,
      user_id: uid,
      description: item.description,
      type: item.type,
      total_value: item.totalValue,
      installment_value: item.installmentValue,
      total_installments: item.totalInstallments,
      status: item.status || 'active',
      start_date: item.startDate,
      end_date: item.endDate
    });
    if (error) throw new Error('Erro ao salvar item: ' + error.message);
  }

  async function deleteFutureItem(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('future_items').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir item: ' + error.message);
  }

  /* ================================================
     GOALS (METAS FINANCEIRAS)
     ================================================ */
  async function loadGoals() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('goals').select('*').eq('user_id', uid).order('created_at');
    return (data || []).map(g => ({
      id: g.id, name: g.name,
      target: parseFloat(g.target),
      saved: parseFloat(g.saved || 0),
      deadline: g.deadline || null,
      emoji: g.emoji || '🎯',
      color: g.color || '#3B82F6'
    }));
  }

  async function addGoal(goal) {
    const uid = ZAuth.getUser()?.id;
    const { data, error } = await _sb.from('goals').insert({
      user_id: uid, name: goal.name,
      target: goal.target, saved: goal.saved || 0,
      deadline: goal.deadline || null,
      emoji: goal.emoji || '🎯', color: goal.color || '#3B82F6'
    }).select('id').single();
    if (error) throw new Error('Erro ao salvar meta: ' + error.message);
    return data.id;
  }

  async function updateGoal(id, updates) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('goals').update(updates).eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao atualizar meta: ' + error.message);
  }

  async function deleteGoal(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('goals').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir meta: ' + error.message);
  }

  /* ================================================
     CREDIT CARDS (CARTÕES DE CRÉDITO)
     ================================================ */
  /* ================================================
     ACCOUNTS (Contas bancárias)
     ================================================ */
  async function loadAccounts() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('accounts').select('*').eq('user_id', uid).order('created_at');
    return (data || []).map(a => ({
      id: a.id, name: a.name, type: a.type,
      color: a.color || '#8B5CF6',
      initialBalance: parseFloat(a.initial_balance || 0)
    }));
  }

  async function loadAccountsWithBalance() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const [accounts, txRes] = await Promise.all([
      loadAccounts(),
      _sb.from('transactions').select('account_name, type, amount').eq('user_id', uid)
    ]);
    const net = {};
    (txRes.data || []).forEach(t => {
      const key = (t.account_name || '').toLowerCase().trim();
      if (!key) return;
      if (!net[key]) net[key] = 0;
      net[key] += t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);
    });
    return accounts.map(a => ({
      ...a,
      balance: a.initialBalance + (net[a.name.toLowerCase().trim()] || 0)
    }));
  }

  async function addAccount(account) {
    const uid = ZAuth.getUser()?.id;
    const { data, error } = await _sb.from('accounts').insert({
      user_id: uid, name: account.name, type: account.type,
      color: account.color || '#8B5CF6',
      initial_balance: account.initialBalance || 0
    }).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  async function updateAccount(id, updates) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('accounts').update({
      name: updates.name, type: updates.type,
      color: updates.color, initial_balance: updates.initialBalance
    }).eq('id', id).eq('user_id', uid);
    if (error) throw new Error(error.message);
  }

  async function deleteAccount(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('accounts').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error(error.message);
  }

  async function loadCreditCards() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('credit_cards').select('*').eq('user_id', uid).order('created_at');
    return (data || []).map(c => ({
      id: c.id, name: c.name,
      closing_day: c.closing_day, due_day: c.due_day,
      limit_amount: c.limit_amount ? parseFloat(c.limit_amount) : null,
      color: c.color || '#0F0F0F'
    }));
  }

  async function addCreditCard(card) {
    const uid = ZAuth.getUser()?.id;
    const { data, error } = await _sb.from('credit_cards').insert({
      user_id: uid, name: card.name,
      closing_day: card.closing_day, due_day: card.due_day,
      limit_amount: card.limit_amount || null,
      color: card.color || '#0F0F0F'
    }).select('id').single();
    if (error) throw new Error('Erro ao salvar cartão: ' + error.message);
    return data.id;
  }

  async function deleteCreditCard(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('credit_cards').delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir cartão: ' + error.message);
  }

  async function loadCardTransactions(months = 3) {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const d = new Date();
    d.setMonth(d.getMonth() - months + 1);
    const startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const { data } = await _sb.from('transactions')
      .select('*, categories(name)')
      .eq('user_id', uid).eq('type', 'expense')
      .gte('year_month', startMonth)
      .order('date', { ascending: false });
    return (data || []).map(t => ({
      id: t.id, date: t.date, description: t.description,
      amount: parseFloat(t.amount), type: t.type,
      category: t.categories?.name || 'Outros',
      account: t.account_name || '',
      yearMonth: t.year_month
    }));
  }

  /* ================================================
     RECURRING TEMPLATES (RECORRENTES E PARCELAMENTOS)
     ================================================ */
  async function loadRecurringTemplates() {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];
    const { data } = await _sb.from('recurring_templates')
      .select('*, categories(name)')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at');
    return (data || []).map(r => ({
      id: r.id,
      description: r.description,
      amount: parseFloat(r.amount),
      type: r.type,
      category: r.categories?.name || 'Outros',
      account: r.account_name || '',
      day_of_month: r.day_of_month || 1,
      kind: r.kind,
      total_installments: r.total_installments,
      start_month: r.start_month,
      last_created_month: r.last_created_month,
      is_active: r.is_active
    }));
  }

  async function addRecurringTemplate(tmpl) {
    const uid = ZAuth.getUser()?.id;
    const { data, error } = await _sb.from('recurring_templates').insert({
      user_id: uid,
      description: tmpl.description,
      amount: tmpl.amount,
      type: tmpl.type,
      category_id: _catId(tmpl.category) || null,
      account_name: tmpl.account || null,
      day_of_month: tmpl.day_of_month || 1,
      kind: tmpl.kind,
      total_installments: tmpl.total_installments || null,
      start_month: tmpl.start_month,
      last_created_month: tmpl.last_created_month || tmpl.start_month,
      is_active: tmpl.is_active !== false
    }).select('id').single();
    if (error) throw new Error('Erro ao salvar template: ' + error.message);
    return data.id;
  }

  async function updateRecurringTemplate(id, updates) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('recurring_templates')
      .update(updates)
      .eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao atualizar template: ' + error.message);
  }

  async function deleteRecurringTemplate(id) {
    const uid = ZAuth.getUser()?.id;
    const { error } = await _sb.from('recurring_templates')
      .delete().eq('id', id).eq('user_id', uid);
    if (error) throw new Error('Erro ao excluir template: ' + error.message);
  }

  /* ================================================
     HISTÓRICO DE GASTOS POR CATEGORIA (últimos N meses)
     ================================================ */
  async function loadMonthsSummary(numMonths = 13) {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return [];

    const monthKeys = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const { data } = await _sb.from('transactions')
      .select('year_month, type, amount, date')
      .eq('user_id', uid)
      .gte('year_month', monthKeys[0])
      .order('date', { ascending: false });

    const byMonth = {};
    (data || []).forEach(t => {
      const ym = t.year_month;
      if (!byMonth[ym]) byMonth[ym] = { count: 0, income: 0, expense: 0, lastDate: null };
      byMonth[ym].count++;
      if (t.type === 'income') byMonth[ym].income += parseFloat(t.amount);
      else byMonth[ym].expense += parseFloat(t.amount);
      if (!byMonth[ym].lastDate || t.date > byMonth[ym].lastDate) byMonth[ym].lastDate = t.date;
    });

    return monthKeys.map(ym => ({
      month: ym,
      count: byMonth[ym]?.count || 0,
      income: byMonth[ym]?.income || 0,
      expense: byMonth[ym]?.expense || 0,
      lastDate: byMonth[ym]?.lastDate || null
    }));
  }

  async function loadCategoryHistory(numMonths) {
    const uid = ZAuth.getUser()?.id;
    if (!uid) return {};

    // Gerar lista dos últimos N meses no formato YYYY-MM
    const monthKeys = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const startMonth = monthKeys[0];

    const { data } = await _sb.from('transactions')
      .select('amount, year_month, categories(name)')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .gte('year_month', startMonth)
      .order('year_month');

    if (!data || data.length === 0) return {};

    // Agrupar por categoria e mês: { cat: { 'YYYY-MM': total } }
    const byCatMonth = {};
    data.forEach(t => {
      const cat = t.categories?.name || 'Outros';
      const ym  = t.year_month;
      if (!byCatMonth[cat]) byCatMonth[cat] = {};
      byCatMonth[cat][ym] = (byCatMonth[cat][ym] || 0) + parseFloat(t.amount);
    });

    // Calcular estatísticas por categoria
    const result = {};
    Object.entries(byCatMonth).forEach(([cat, totals]) => {
      const nonZero = monthKeys.map(m => totals[m] || 0).filter(v => v > 0);
      if (nonZero.length === 0) return;
      const min  = Math.min(...nonZero);
      const max  = Math.max(...nonZero);
      const avg  = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
      // Dados mensais completos para sparkline
      const monthly = monthKeys.map(m => ({ month: m, value: totals[m] || 0 }));
      result[cat] = { min, max, avg, monthly };
    });

    return result;
  }

  return {
    loadAll, loadMonth,
    addTransaction, updateTransaction, deleteTransaction,
    addBudgetItem, deleteBudgetItem,
    addAsset, deleteAsset,
    addDebt, deleteDebt,
    addFutureItem, deleteFutureItem,
    loadGoals, addGoal, updateGoal, deleteGoal,
    loadAccounts, loadAccountsWithBalance, addAccount, updateAccount, deleteAccount,
    loadCreditCards, addCreditCard, deleteCreditCard, loadCardTransactions,
    loadRecurringTemplates, addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    loadCategoryHistory, loadMonthsSummary
  };

})();
