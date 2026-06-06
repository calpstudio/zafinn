/* ================================================
   ZAFINN - Utilitários e Helpers
   ================================================ */

const ZUtils = (function() {

  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MONTHS_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  /* ---------- Formatação de moeda ---------- */
  function formatCurrency(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatCurrencyShort(value) {
    if (Math.abs(value) >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
    if (Math.abs(value) >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
    return formatCurrency(value);
  }

  /* ---------- Formatação de data ---------- */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const mon = MONTHS_PT[parseInt(m) - 1];
    return `${d} de ${mon} de ${y}`;
  }

  /* ---------- Mês atual ---------- */
  function getCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function getMonthName(yearMonth) {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-');
    return `${MONTHS_PT[parseInt(m) - 1]} ${y}`;
  }

  function getMonthNameShort(yearMonth) {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-');
    return `${MONTHS_PT_SHORT[parseInt(m) - 1]}/${y.slice(2)}`;
  }

  function prevMonth(yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function nextMonth(yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function isCurrentOrPastMonth(yearMonth) {
    return yearMonth <= getCurrentMonth();
  }

  /* ---------- ID único ---------- */
  function generateId() {
    return crypto.randomUUID();
  }

  /* ---------- Porcentagem ---------- */
  function pct(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  function pctStr(value, total) {
    return pct(value, total) + '%';
  }

  /* ---------- Ícones e cores de categoria ---------- */
  const CAT_CONFIG = {
    'Salário':        { emoji: '💼', color: '#059669', bg: '#ECFDF5' },
    'Pró-labore':     { emoji: '🏢', color: '#059669', bg: '#ECFDF5' },
    'Comissões':      { emoji: '📊', color: '#059669', bg: '#ECFDF5' },
    'Renda Extra':    { emoji: '✨', color: '#7C3AED', bg: '#F5F3FF' },
    'Aluguéis':       { emoji: '🏘️', color: '#059669', bg: '#ECFDF5' },
    'Investimentos':  { emoji: '💰', color: '#059669', bg: '#ECFDF5' },
    'Outras Receitas':{ emoji: '🎁', color: '#059669', bg: '#ECFDF5' },
    'Pensão':         { emoji: '👨‍👧', color: '#059669', bg: '#ECFDF5' },
    'Moradia':        { emoji: '🏠', color: '#3B82F6', bg: '#EFF6FF' },
    'Alimentação':    { emoji: '🍕', color: '#F59E0B', bg: '#FFFBEB' },
    'Transporte':     { emoji: '🚗', color: '#8B5CF6', bg: '#F5F3FF' },
    'Saúde':          { emoji: '❤️', color: '#EC4899', bg: '#FDF2F8' },
    'Lazer':          { emoji: '🎉', color: '#14B8A6', bg: '#F0FDFA' },
    'Educação':       { emoji: '📚', color: '#6366F1', bg: '#EEF2FF' },
    'Cartões':        { emoji: '💳', color: '#F97316', bg: '#FFF7ED' },
    'Dívidas':        { emoji: '📋', color: '#DC2626', bg: '#FEF2F2' },
    'Assinaturas':    { emoji: '📱', color: '#06B6D4', bg: '#ECFEFF' },
    'Impostos':       { emoji: '🧾', color: '#84CC16', bg: '#F7FEE7' },
    'Vestuário':      { emoji: '👗', color: '#D946EF', bg: '#FDF4FF' },
    'Animais':        { emoji: '🐾', color: '#92400E', bg: '#FEF3C7' },
    'Presentes':      { emoji: '🎀', color: '#BE185D', bg: '#FDF2F8' },
    'Outros':         { emoji: '📦', color: '#78716C', bg: '#F5F5F4' }
  };

  function getCatConfig(category) {
    return CAT_CONFIG[category] || { emoji: '📦', color: '#78716C', bg: '#F5F5F4' };
  }

  /* ---------- Grupos de data para transações ---------- */
  function groupByDate(transactions) {
    const groups = {};
    transactions.forEach(tx => {
      const key = tx.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }

  /* ---------- Diagnóstico automático ---------- */
  function generateDiagnosis(data, yearMonth) {
    const totals = ZData.getMonthTotals(data, yearMonth);
    const catReal = ZData.getCategoryTotals(data, yearMonth);
    const catBudget = ZData.getBudgetByCategory(data, yearMonth);
    const benchmarks = data.benchmarks;
    const messages = [];

    const income = totals.realIncome;
    const expense = totals.realExpense;
    const balance = income - expense;
    const savingsPct = income > 0 ? Math.round((balance / income) * 100) : 0;

    if (income === 0) {
      messages.push({ icon: '⚠️', type: 'warning', bg: '#FFFBEB', text: 'Nenhuma receita registrada neste mês ainda.' });
      return messages;
    }

    if (savingsPct >= 20) messages.push({ icon: '🏆', type: 'success', bg: '#ECFDF5', text: `Parabéns! Você poupou <strong>${savingsPct}%</strong> da sua renda este mês.` });
    else if (savingsPct >= 10) messages.push({ icon: '✅', type: 'success', bg: '#ECFDF5', text: `Bom trabalho! Você conseguiu poupar <strong>${savingsPct}%</strong> da renda.` });
    else if (savingsPct > 0) messages.push({ icon: '⚠️', type: 'warning', bg: '#FFFBEB', text: `Poupança abaixo do ideal: apenas <strong>${savingsPct}%</strong>. O recomendado é pelo menos 10%.` });
    else if (balance < 0) messages.push({ icon: '🚨', type: 'danger', bg: '#FEF2F2', text: `Suas despesas superaram a renda em <strong>${formatCurrency(Math.abs(balance))}</strong>. Atenção!` });

    Object.entries(catReal).forEach(([cat, realVal]) => {
      const bench = benchmarks[cat];
      if (!bench || income === 0) return;
      const pctVal = Math.round((realVal / income) * 100);
      const budgetVal = catBudget[cat] || 0;

      if (pctVal > bench.max + 5) {
        messages.push({ icon: bench.emoji || '⚠️', type: 'warning', bg: '#FEF3C7', text: `<strong>${cat}</strong>: você gastou <strong>${pctVal}%</strong> da renda (ideal: até ${bench.max}%). Valor: ${formatCurrency(realVal)}.` });
      }

      if (budgetVal > 0) {
        const deviation = Math.round(((realVal - budgetVal) / budgetVal) * 100);
        if (deviation > 20) {
          messages.push({ icon: '📈', type: 'danger', bg: '#FEF2F2', text: `<strong>${cat}</strong>: ${deviation}% acima do orçado (orçado ${formatCurrency(budgetVal)}, gasto ${formatCurrency(realVal)}).` });
        }
      }
    });

    const investPct = income > 0 ? Math.round(((catReal['Investimentos'] || 0) / income) * 100) : 0;
    if (investPct < 10 && income > 0) {
      messages.push({ icon: '💡', type: 'info', bg: '#EFF6FF', text: `Você investiu apenas <strong>${investPct}%</strong> da renda. O recomendado é investir pelo menos 10%.` });
    }

    if (messages.length === 0) {
      messages.push({ icon: '👍', type: 'success', bg: '#ECFDF5', text: 'Suas finanças estão equilibradas este mês. Continue assim!' });
    }

    return messages;
  }

  /* ---------- Projeções futuras ---------- */
  function getFutureProjections(data, fromMonth, count) {
    const projections = [];
    let current = fromMonth;
    for (let i = 0; i < count; i++) {
      current = nextMonth(current);
      const [y, m] = current.split('-').map(Number);
      const monthDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0);

      let income = 0, expense = 0;

      (data.futureItems || []).forEach(f => {
        if (f.status !== 'active') return;
        const start = new Date(f.startDate);
        const end = new Date(f.endDate);
        if (monthDate <= end && endDate >= start) {
          if (f.type === 'income') income += f.installmentValue;
          else expense += f.installmentValue;
        }
      });

      projections.push({ month: current, name: getMonthName(current), income, expense, balance: income - expense });
    }
    return projections;
  }

  /* ---------- Hora atual (para status bar) ---------- */
  function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  }

  return {
    formatCurrency, formatCurrencyShort,
    formatDate, formatDateShort, formatDateFull,
    getCurrentMonth, getMonthName, getMonthNameShort,
    prevMonth, nextMonth, isCurrentOrPastMonth,
    generateId, pct, pctStr,
    getCatConfig, groupByDate,
    generateDiagnosis, getFutureProjections,
    getCurrentTime
  };

})();
