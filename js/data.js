/* ================================================
   ZAFINN - Gerenciamento de Dados
   Salva e carrega tudo no navegador (localStorage)
   ================================================ */

const ZData = (function() {

  const STORAGE_KEY = 'zafinn_data_v1';

  /* ---------- Estado inicial vazio ---------- */
  const DEMO_DATA = {
    months: {},
    assets: [],
    debts: [],
    futureItems: [],
    categories: {
      incomes: ['Salário', 'Pró-labore', 'Comissões', 'Renda Extra', 'Aluguéis', 'Investimentos', 'Pensão', 'Outras Receitas'],
      expenses: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Cartões', 'Dívidas', 'Assinaturas', 'Impostos', 'Investimentos', 'Vestuário', 'Animais', 'Presentes', 'Outros']
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

  /* ---------- Carregar dados ---------- */
  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.assign({}, DEMO_DATA, parsed, {
          categories: Object.assign({}, DEMO_DATA.categories, parsed.categories),
          benchmarks: Object.assign({}, DEMO_DATA.benchmarks, parsed.benchmarks)
        });
      }
    } catch(e) { console.warn('Erro ao carregar dados:', e); }
    return JSON.parse(JSON.stringify(DEMO_DATA));
  }

  /* ---------- Salvar dados ---------- */
  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) { console.warn('Erro ao salvar:', e); }
  }

  /* ---------- Garantir que o mês existe ---------- */
  function ensureMonth(data, yearMonth) {
    if (!data.months[yearMonth]) {
      data.months[yearMonth] = {
        budget: { incomes: [], expenses: [] },
        transactions: []
      };
    }
    return data;
  }

  /* ---------- Totais do mês ---------- */
  function getMonthTotals(data, yearMonth) {
    const month = data.months[yearMonth];
    if (!month) return { budgetIncome: 0, budgetExpense: 0, realIncome: 0, realExpense: 0 };

    const budgetIncome = (month.budget.incomes || []).reduce((s, i) => s + i.amount, 0);
    const budgetExpense = (month.budget.expenses || []).reduce((s, i) => s + i.amount, 0);
    const realIncome = (month.transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const realExpense = (month.transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return { budgetIncome, budgetExpense, realIncome, realExpense };
  }

  /* ---------- Gastos por categoria (realizado) ---------- */
  function getCategoryTotals(data, yearMonth) {
    const month = data.months[yearMonth];
    if (!month) return {};
    const result = {};
    (month.transactions || []).filter(t => t.type === 'expense').forEach(t => {
      result[t.category] = (result[t.category] || 0) + t.amount;
    });
    return result;
  }

  /* ---------- Orçado por categoria ---------- */
  function getBudgetByCategory(data, yearMonth) {
    const month = data.months[yearMonth];
    if (!month) return {};
    const result = {};
    (month.budget.expenses || []).forEach(e => {
      result[e.category] = (result[e.category] || 0) + e.amount;
    });
    return result;
  }

  /* ---------- Patrimônio líquido ---------- */
  function getNetWorth(data) {
    const totalAssets = (data.assets || []).reduce((s, a) => s + a.currentValue, 0);
    const totalDebts = (data.debts || []).reduce((s, d) => s + d.remainingBalance, 0);
    return { totalAssets, totalDebts, netWorth: totalAssets - totalDebts };
  }

  /* ---------- API pública ---------- */
  return {
    load,
    save,
    ensureMonth,
    getMonthTotals,
    getCategoryTotals,
    getBudgetByCategory,
    getNetWorth,

    addTransaction(data, yearMonth, tx) {
      data = ensureMonth(data, yearMonth);
      data.months[yearMonth].transactions.unshift(tx);
      save(data); return data;
    },

    deleteTransaction(data, yearMonth, id) {
      data.months[yearMonth].transactions = data.months[yearMonth].transactions.filter(t => t.id !== id);
      save(data); return data;
    },

    addBudgetItem(data, yearMonth, type, item) {
      data = ensureMonth(data, yearMonth);
      data.months[yearMonth].budget[type].push(item);
      save(data); return data;
    },

    deleteBudgetItem(data, yearMonth, type, id) {
      data.months[yearMonth].budget[type] = data.months[yearMonth].budget[type].filter(i => i.id !== id);
      save(data); return data;
    },

    addAsset(data, asset) {
      data.assets.push(asset);
      save(data); return data;
    },

    deleteAsset(data, id) {
      data.assets = data.assets.filter(a => a.id !== id);
      save(data); return data;
    },

    addDebt(data, debt) {
      data.debts.push(debt);
      save(data); return data;
    },

    deleteDebt(data, id) {
      data.debts = data.debts.filter(d => d.id !== id);
      save(data); return data;
    },

    addFutureItem(data, item) {
      data.futureItems.push(item);
      save(data); return data;
    },

    deleteFutureItem(data, id) {
      data.futureItems = data.futureItems.filter(f => f.id !== id);
      save(data); return data;
    },

    resetToDemo() {
      localStorage.removeItem(STORAGE_KEY);
      return JSON.parse(JSON.stringify(DEMO_DATA));
    }
  };

})();
