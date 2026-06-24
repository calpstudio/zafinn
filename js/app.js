/* ================================================
   ZAFINN - Controlador Principal
   Gerencia layout desktop (sidebar) e mobile (bottom nav)
   ================================================ */

const ZApp = (function() {

  const state = {
    screen: 'dashboard',
    month: ZUtils.getCurrentMonth(),
    data: null,
    modal: null,
    modalParams: null,
    mobileSidebarOpen: false,
    mobileMenuOpen: false
  };

  /* ---------- Detectar tamanho de tela ---------- */
  function isDesktop() { return window.innerWidth >= 1024; }

  /* ---------- Calcular diferença em meses ---------- */
  function _mdiff(from, to) {
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm);
  }

  /* ---------- Templates recorrentes pendentes para um mês ---------- */
  function _getPendingTemplates(templates, month) {
    return (templates || []).filter(t => {
      if (!t.is_active) return false;
      if (month < t.start_month) return false;
      if (t.last_created_month >= month) return false;
      if (t.kind === 'installment') {
        const installNum = _mdiff(t.start_month, month) + 1;
        return installNum <= t.total_installments;
      }
      return true;
    });
  }

  /* ---------- Confirmar lançamentos recorrentes do mês atual ---------- */
  async function confirmRecurring() {
    const month = state.month;
    const pending = _getPendingTemplates(state.data.recurringTemplates || [], month);
    if (pending.length === 0) return;

    const btn = document.getElementById('btn-confirm-recurring');
    if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }

    try {
      for (const tmpl of pending) {
        const [y, m] = month.split('-').map(Number);
        const maxDay = new Date(y, m, 0).getDate();
        const day = Math.min(tmpl.day_of_month, maxDay);
        const date = `${month}-${String(day).padStart(2, '0')}`;

        let txDesc = tmpl.description;
        let isFinished = false;
        if (tmpl.kind === 'installment') {
          const installNum = _mdiff(tmpl.start_month, month) + 1;
          txDesc = `${tmpl.description} ${installNum}/${tmpl.total_installments}`;
          isFinished = installNum >= tmpl.total_installments;
        }

        const newTx = {
          id: ZUtils.generateId(), date, description: txDesc,
          amount: tmpl.amount, type: tmpl.type,
          category: tmpl.category, account: tmpl.account || '', notes: ''
        };

        await ZDB.addTransaction(month, newTx);
        if (!state.data.months[month]) state.data.months[month] = { transactions: [], budget: { incomes: [], expenses: [] } };
        state.data.months[month].transactions.unshift(newTx);

        await ZDB.updateRecurringTemplate(tmpl.id, {
          last_created_month: month,
          is_active: !isFinished
        });

        const idx = (state.data.recurringTemplates || []).findIndex(t => t.id === tmpl.id);
        if (idx >= 0) {
          state.data.recurringTemplates[idx].last_created_month = month;
          if (isFinished) state.data.recurringTemplates[idx].is_active = false;
        }
      }
      render();
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    }
  }

  /* ---------- Contar categorias acima do orçamento ---------- */
  function _getBudgetAlerts(data, month) {
    const monthData = data?.months?.[month];
    if (!monthData) return 0;
    const realByCat = {};
    (monthData.transactions || []).filter(t => t.type === 'expense')
      .forEach(t => { realByCat[t.category] = (realByCat[t.category] || 0) + t.amount; });
    const budgetByCat = {};
    (monthData.budget?.expenses || [])
      .forEach(e => { budgetByCat[e.category] = (budgetByCat[e.category] || 0) + e.amount; });
    return Object.entries(realByCat).filter(([cat, real]) => budgetByCat[cat] > 0 && real > budgetByCat[cat]).length;
  }

  /* ---------- Inicializar ---------- */
  async function init() {
    const autenticado = await ZAuth.init();
    if (!autenticado) {
      ZAuth.renderAuthScreen('login');
      return;
    }

    state.data = await ZDB.loadAll(state.month);
    render();

    // Onboarding: mostrar uma vez para novos usuários
    if (!localStorage.getItem('zafinn_onboarded')) {
      setTimeout(() => openModal('onboarding', { step: 1 }), 800);
    }

    // Atualizar horário a cada 30s (para mobile)
    setInterval(() => {
      const el = document.getElementById('status-time');
      if (el) el.textContent = ZUtils.getCurrentTime();
    }, 30000);

    // Re-renderizar ao redimensionar (troca desktop ↔ mobile)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { render(); }, 150);
    });
  }

  /* ---------- Navegar para tela ---------- */
  function navigate(screen) {
    state.screen = screen;
    state.modal = null;
    state.modalParams = null;
    state.mobileSidebarOpen = false;
    state.mobileMenuOpen = false;

    // Carrega histórico de categorias ao entrar em Análise
    if (screen === 'comparison' && !state.data.categoryHistory) {
      state.data.categoryHistory = 'loading';
      ZDB.loadCategoryHistory(6).then(history => {
        state.data.categoryHistory = history;
        if (state.screen === 'comparison') render();
      }).catch(() => { state.data.categoryHistory = null; });
    }

    // Carrega contas com saldo ao entrar em Contas
    if (screen === 'accounts') {
      state.data.accountsWithBalance = null;
      ZDB.loadAccountsWithBalance().then(accs => {
        state.data.accountsWithBalance = accs;
        if (state.screen === 'accounts') render();
      }).catch(() => { state.data.accountsWithBalance = []; });
    }

    // Carrega resumo dos meses ao entrar em Configurações
    if (screen === 'settings') {
      state.data.monthsSummary = null;
      ZDB.loadMonthsSummary(13).then(summary => {
        state.data.monthsSummary = summary;
        if (state.screen === 'settings') render();
      }).catch(() => { state.data.monthsSummary = []; });
    }

    // Carrega (ou recarrega) transações dos últimos 3 meses ao entrar em Cartões
    if (screen === 'cards') {
      ZDB.loadCardTransactions(3).then(txs => {
        state.data.cardTransactions = txs;
        if (state.screen === 'cards') render();
      }).catch(() => { state.data.cardTransactions = []; });
    }

    render();
    const content = document.getElementById('page-content');
    if (content) content.scrollTop = 0;
  }

  /* ---------- Trocar mês ---------- */
  async function changeMonth(direction) {
    state.month = direction === -1 ? ZUtils.prevMonth(state.month) : ZUtils.nextMonth(state.month);

    if (!state.data.months[state.month]) {
      // Mostrar loading enquanto busca o mês no Supabase
      const pc = document.getElementById('page-content') || document.querySelector('.screen-content');
      if (pc) pc.innerHTML = '<div style="padding:60px; text-align:center; color:var(--text-muted); font-size:14px">Carregando...</div>';

      const monthData = await ZDB.loadMonth(state.month);
      state.data.months[state.month] = monthData;
    }

    render();
  }

  /* ---------- Abrir modal ---------- */
  function openModal(type, params) {
    state.modal = type;
    state.modalParams = params || {};
    renderModal();
  }

  function closeModal() {
    state.modal = null;
    state.modalParams = null;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  }

  function openEditTx(txId) {
    openModal('editTransaction', { txId, month: state.month });
  }

  /* ---------- Renderização principal ---------- */
  function render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (isDesktop()) {
      renderDesktopLayout(appEl);
    } else {
      renderMobileLayout(appEl);
    }

    if (state.modal) renderModal();
  }

  /* ================================================
     LAYOUT DESKTOP
     ================================================ */
  function renderDesktopLayout(appEl) {
    appEl.innerHTML = `
      <div style="display:flex; min-height:100vh;">
        ${renderSidebar()}
        <div class="main-wrapper">
          ${renderAppHeader()}
          <main class="page-content" id="page-content">
            ${renderScreenContent()}
          </main>
        </div>
      </div>
    `;
  }

  function renderSidebar() {
    const s = state.screen;
    const budgetAlerts = _getBudgetAlerts(state.data, state.month);
    const navGroups = [
      {
        label: 'Principal',
        items: [
          { id: 'dashboard',    label: 'Dashboard',    icon: iDashboard() },
          { id: 'accounts',     label: 'Contas',       icon: iAccounts() },
          { id: 'cards',        label: 'Cartões',      icon: iCards() },
          { id: 'transactions', label: 'Transações',   icon: iTransactions() },
        ]
      },
      {
        label: 'Análise',
        items: [
          { id: 'budget',       label: 'Orçamento',    icon: iBudget(),      alert: budgetAlerts },
          { id: 'comparison',   label: 'Análise',      icon: iAnalysis() },
          { id: 'cashflow',     label: 'Fluxo Futuro', icon: iCashflow() },
        ]
      },
      {
        label: 'Planejamento',
        items: [
          { id: 'goals',        label: 'Metas',        icon: iGoals() },
          { id: 'patrimony',    label: 'Patrimônio',   icon: iPatrimony() },
          { id: 'cs_relatorios',label: 'Relatórios',   icon: iReports() },
        ]
      },
      {
        label: 'Sistema',
        items: [
          { id: 'settings',     label: 'Configurações',icon: iSettings() },
        ]
      }
    ];

    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <img src="images/logo.png" alt="ZAFINN" class="sidebar-logo-img">
          <div class="logo-sub">finanças bem organizadas</div>
        </div>

        <nav class="sidebar-nav">
          ${navGroups.map(group => `
            <div class="nav-group">
              <div class="nav-group-label">${group.label}</div>
              ${group.items.map(item => `
                <button class="nav-link ${s === item.id ? 'active' : ''}" onclick="ZApp.navigate('${item.id}')">
                  ${item.icon}
                  <span>${item.label}</span>
                  ${item.id.startsWith('cs_') ? '<span class="nav-badge">Em breve</span>' : ''}
                  ${item.alert > 0 ? `<span class="nav-alert-badge">${item.alert}</span>` : ''}
                </button>
              `).join('')}
            </div>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" onclick="ZApp.navigate('settings')" style="cursor:pointer">
            <div class="user-avatar">${ZAuth.getUserInitials()}</div>
            <div style="flex:1; min-width:0">
              <div class="user-name">${ZAuth.getUserName()}</div>
              <div class="user-sub">${ZAuth.getUserEmail()}</div>
            </div>
          </div>
          <button onclick="ZAuth.signOut()" style="width:100%; margin-top:8px; padding:8px; background:rgba(220,38,38,0.1); border:1px solid rgba(220,38,38,0.2); color:#F87171; border-radius:var(--radius-sm); font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s" onmouseover="this.style.background='rgba(220,38,38,0.2)'" onmouseout="this.style.background='rgba(220,38,38,0.1)'">
            Sair da conta
          </button>
        </div>
      </aside>
    `;
  }

  function renderAppHeader() {
    const pageInfo = getPageInfo(state.screen);
    return `
      <header class="app-header">
        <div class="header-left">
          <div>
            <div class="header-page-title">${pageInfo.title}</div>
            <div class="header-page-sub">${pageInfo.sub}</div>
          </div>
          <div class="header-month-selector">
            <span>${ZUtils.getMonthName(state.month)}</span>
            <button class="hms-btn" onclick="ZApp.changeMonth(-1)" title="Mês anterior">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="hms-btn" onclick="ZApp.changeMonth(1)" title="Próximo mês">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
        <div class="header-right">
          <button class="header-action-btn" onclick="ZApp.openModal('addTransaction', {month:'${state.month}'})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Lançamento
          </button>
          <button class="header-icon-btn" onclick="ZApp.navigate('settings')" title="Configurações">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </header>
    `;
  }

  function getPageInfo(screen) {
    const map = {
      dashboard:    { title: 'Dashboard',      sub: 'Visão geral das suas finanças' },
      accounts:     { title: 'Contas',          sub: 'Saldo disponível por conta' },
      budget:       { title: 'Orçamento',       sub: 'Planejamento de receitas e despesas' },
      transactions: { title: 'Transações',      sub: 'Todos os lançamentos do mês' },
      comparison:   { title: 'Análise',         sub: 'Orçado x Realizado' },
      cashflow:     { title: 'Fluxo Futuro',    sub: 'Projeção dos próximos meses' },
      patrimony:    { title: 'Patrimônio',      sub: 'Bens, ativos e dívidas' },
      goals:        { title: 'Metas',           sub: 'Seus objetivos financeiros' },
      cards:        { title: 'Cartões',         sub: 'Faturas e limites dos seus cartões' },
      settings:     { title: 'Configurações',   sub: 'Preferências do sistema' },
    };
    return map[screen] || { title: screen.charAt(0).toUpperCase() + screen.slice(1), sub: '' };
  }

  /* ================================================
     LAYOUT MOBILE
     ================================================ */
  function renderMobileLayout(appEl) {
    appEl.innerHTML = `
      <div style="min-height:100vh; display:flex; flex-direction:column; background:var(--bg)">
        ${renderMobileHeader()}
        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column">
          ${renderScreenContent()}
        </div>
        ${renderBottomNav()}
        ${state.mobileMenuOpen ? renderMobileMenuDrawer() : ''}
      </div>
    `;
  }

  function toggleMobileMenu() {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    render();
  }

  function renderMobileMenuDrawer() {
    const s = state.screen;
    const budgetAlerts = _getBudgetAlerts(state.data, state.month);

    const groups = [
      {
        label: 'Principal',
        items: [
          { id: 'transactions', label: 'Transações',   icon: iTransactions() },
          { id: 'comparison',   label: 'Análise',      icon: iAnalysis() },
        ]
      },
      {
        label: 'Planejamento',
        items: [
          { id: 'goals',     label: 'Metas',        icon: iGoals() },
          { id: 'cards',     label: 'Cartões',      icon: iCards() },
          { id: 'cashflow',  label: 'Fluxo Futuro', icon: iCashflow() },
          { id: 'patrimony', label: 'Patrimônio',   icon: iPatrimony() },
        ]
      },
      {
        label: 'Sistema',
        items: [
          { id: 'settings', label: 'Configurações', icon: iSettings() },
        ]
      }
    ];

    return `
      <div class="mobile-menu-backdrop" onclick="ZApp.toggleMobileMenu()"></div>
      <div class="mobile-menu-drawer">
        <div class="mmd-handle"></div>
        <div class="mmd-header">
          <span class="mmd-title">Menu</span>
          <button class="mmd-close" onclick="ZApp.toggleMobileMenu()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="mmd-body">
          ${groups.map(group => `
            <div class="mmd-group-label">${group.label}</div>
            ${group.items.map(item => `
              <button class="mmd-item ${s === item.id ? 'active' : ''}" onclick="ZApp.navigate('${item.id}')">
                <span class="mmd-item-icon">${item.icon}</span>
                <span class="mmd-item-label">${item.label}</span>
                ${item.id === 'budget' && budgetAlerts > 0 ? `<span class="mmd-badge">${budgetAlerts}</span>` : ''}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" style="color:var(--text-muted); margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            `).join('')}
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderMobileHeader() {
    const pageInfo = getPageInfo(state.screen);
    return `
      <header class="mobile-header">
        <div class="mh-left">
          <div>
            <div class="mh-logo">ZAFINN</div>
          </div>
        </div>
        <div class="mh-right">
          <div class="month-selector" style="border:none; background:var(--bg); padding:5px 4px 5px 10px">
            <span style="font-size:12px">${ZUtils.getMonthNameShort(state.month)}</span>
            <button class="month-btn" onclick="ZApp.changeMonth(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="month-btn" onclick="ZApp.changeMonth(1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <button class="mh-add-btn" onclick="ZApp.openModal('addTransaction', {month:'${state.month}'})" title="Novo lançamento">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </header>
    `;
  }

  function renderBottomNav() {
    const s = state.screen;
    const budgetAlerts = _getBudgetAlerts(state.data, state.month);
    const menuScreens = ['transactions','comparison','goals','cards','cashflow','patrimony','settings'];
    const menuActive = menuScreens.includes(s);

    return `
      <nav class="bottom-nav">
        <button class="nav-item ${s === 'dashboard' ? 'active' : ''}" onclick="ZApp.navigate('dashboard')">
          ${iDashboard()}
          <span>Início</span>
        </button>
        <button class="nav-item ${s === 'budget' ? 'active' : ''}" onclick="ZApp.navigate('budget')" style="position:relative">
          ${iBudget()}
          <span>Orçamento</span>
          ${budgetAlerts > 0 ? `<span style="position:absolute;top:4px;right:8px;background:var(--danger);color:white;font-size:9px;font-weight:700;border-radius:8px;padding:1px 5px;min-width:16px;text-align:center">${budgetAlerts}</span>` : ''}
        </button>
        <button class="nav-center-btn" onclick="ZApp.openModal('addTransaction', {month:'${state.month}'})">
          ${iPlus()}
        </button>
        <button class="nav-item ${s === 'transactions' ? 'active' : ''}" onclick="ZApp.navigate('transactions')">
          ${iTransactions()}
          <span>Lançamentos</span>
        </button>
        <button class="nav-item ${menuActive && s !== 'transactions' ? 'active' : ''}" onclick="ZApp.toggleMobileMenu()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="22"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          <span>Menu</span>
        </button>
      </nav>
    `;
  }

  /* ---------- Conteúdo da tela atual ---------- */
  function renderScreenContent() {
    const pending = _getPendingTemplates(state.data.recurringTemplates || [], state.month);
    const banner = (pending.length > 0 && !state.screen.startsWith('cs_') && state.screen !== 'settings') ? `
      <div class="recurring-banner">
        <div class="recurring-banner-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" style="color:var(--primary); flex-shrink:0"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4l3 3"/></svg>
          <span><strong>${pending.length} lançamento${pending.length > 1 ? 's' : ''} recorrente${pending.length > 1 ? 's' : ''}</strong> pendente${pending.length > 1 ? 's' : ''} em ${ZUtils.getMonthName(state.month)}</span>
        </div>
        <button class="btn btn-primary" id="btn-confirm-recurring" onclick="ZApp.confirmRecurring()" style="padding:7px 16px; font-size:12px; white-space:nowrap">
          Lançar todos
        </button>
      </div>
    ` : '';

    let content;
    switch(state.screen) {
      case 'dashboard':    content = ZDashboard.render(state); break;
      case 'accounts':     content = ZAccounts.render(state); break;
      case 'budget':       content = ZBudget.render(state); break;
      case 'transactions': content = ZTransactions.render(state); break;
      case 'comparison':   content = ZComparison.render(state); break;
      case 'patrimony':    content = ZPatrimony.render(state); break;
      case 'cashflow':     content = ZCashflow.render(state); break;
      case 'goals':        content = ZGoals.render(state); break;
      case 'cards':        content = ZCards.render(state); break;
      case 'settings':     content = ZSettings.render(state); break;
      default:
        if (state.screen.startsWith('cs_')) content = renderComingSoon(state.screen);
        else content = ZDashboard.render(state);
    }
    return banner + content;
  }

  function renderComingSoon(screen) {
    const info = {
      cs_cartoes:    { icon: '💳', title: 'Cartões',     desc: 'Controle de cartões de crédito, faturas e limites.' },
      cs_contas:     { icon: '🏦', title: 'Contas',       desc: 'Gestão de contas bancárias e saldos.' },
      cs_categorias: { icon: '🏷️', title: 'Categorias',  desc: 'Personalização de categorias e subcategorias.' },
      cs_relatorios: { icon: '📈', title: 'Relatórios',   desc: 'Relatórios avançados, gráficos e exportação de dados.' },
    };
    const d = info[screen] || { icon: '🚀', title: 'Em Breve', desc: 'Esta funcionalidade está sendo desenvolvida.' };
    return `
      <div class="coming-soon">
        <div class="cs-icon">${d.icon}</div>
        <h2>${d.title}</h2>
        <p>${d.desc}</p>
        <span class="badge-soon">🔨 Em desenvolvimento</span>
      </div>
    `;
  }

  /* ---------- Modal ---------- */
  function renderModal() {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
    if (!state.modal) return;

    const content = ZModals.render(state.modal, state.modalParams || {});
    if (!content) return;

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-sheet">${content}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    document.getElementById('app').appendChild(overlay);

    setTimeout(() => {
      const first = overlay.querySelector('input:not([type="hidden"])');
      if (first) first.focus();
    }, 300);
  }

  /* ================================================
     ÍCONES SVG
     ================================================ */
  function iDashboard() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
  }
  function iBudget() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
  }
  function iTransactions() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
  }
  function iAnalysis() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  }
  function iCashflow() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  }
  function iPatrimony() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  function iReports() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  }
  function iSettings() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  }
  function iGoals() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
  }
  function iCards() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
  }
  function iAccounts() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
  function iPlus() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }

  return {
    state, init, render, navigate, changeMonth,
    openModal, closeModal, openEditTx, isDesktop,
    confirmRecurring, toggleMobileMenu
  };

})();

document.addEventListener('DOMContentLoaded', async function() { await ZApp.init(); });
