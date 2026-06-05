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
    mobileSidebarOpen: false
  };

  /* ---------- Detectar tamanho de tela ---------- */
  function isDesktop() { return window.innerWidth >= 1024; }

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

    // Carrega histórico de categorias ao entrar em Análise
    if (screen === 'comparison' && !state.data.categoryHistory) {
      state.data.categoryHistory = 'loading';
      ZDB.loadCategoryHistory(6).then(history => {
        state.data.categoryHistory = history;
        if (state.screen === 'comparison') render();
      }).catch(() => { state.data.categoryHistory = null; });
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
          { id: 'budget',       label: 'Orçamento',    icon: iBudget(),      alert: budgetAlerts },
          { id: 'transactions', label: 'Transações',   icon: iTransactions() },
          { id: 'comparison',   label: 'Análise',      icon: iAnalysis() },
        ]
      },
      {
        label: 'Planejamento',
        items: [
          { id: 'goals',        label: 'Metas',        icon: iGoals() },
          { id: 'cashflow',     label: 'Fluxo Futuro', icon: iCashflow() },
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
      budget:       { title: 'Orçamento',       sub: 'Planejamento de receitas e despesas' },
      transactions: { title: 'Transações',      sub: 'Todos os lançamentos do mês' },
      comparison:   { title: 'Análise',         sub: 'Orçado x Realizado' },
      cashflow:     { title: 'Fluxo Futuro',    sub: 'Projeção dos próximos meses' },
      patrimony:    { title: 'Patrimônio',      sub: 'Bens, ativos e dívidas' },
      goals:        { title: 'Metas',           sub: 'Seus objetivos financeiros' },
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
    const items = [
      { id: 'dashboard',    icon: iDashboard(),    label: 'Início' },
      { id: 'budget',       icon: iBudget(),        label: 'Orçamento', alert: budgetAlerts },
      { id: '_add_',        center: true },
      { id: 'goals',        icon: iGoals(),         label: 'Metas' },
      { id: 'patrimony',    icon: iPatrimony(),     label: 'Patrimônio' },
    ];
    return `
      <nav class="bottom-nav">
        ${items.map(item => {
          if (item.center) return `<button class="nav-center-btn" onclick="ZApp.openModal('addTransaction', {month:'${state.month}'})">${iPlus()}</button>`;
          return `<button class="nav-item ${s === item.id ? 'active' : ''}" onclick="ZApp.navigate('${item.id}')" style="position:relative">
            ${item.icon}
            <span>${item.label}</span>
            ${item.alert > 0 ? `<span style="position:absolute; top:4px; right:8px; background:var(--danger); color:white; font-size:9px; font-weight:700; border-radius:8px; padding:1px 5px; min-width:16px; text-align:center">${item.alert}</span>` : ''}
          </button>`;
        }).join('')}
      </nav>
    `;
  }

  /* ---------- Conteúdo da tela atual ---------- */
  function renderScreenContent() {
    switch(state.screen) {
      case 'dashboard':    return ZDashboard.render(state);
      case 'budget':       return ZBudget.render(state);
      case 'transactions': return ZTransactions.render(state);
      case 'comparison':   return ZComparison.render(state);
      case 'patrimony':    return ZPatrimony.render(state);
      case 'cashflow':     return ZCashflow.render(state);
      case 'goals':        return ZGoals.render(state);
      case 'settings':     return ZSettings.render(state);
      default:
        if (state.screen.startsWith('cs_')) return renderComingSoon(state.screen);
        return ZDashboard.render(state);
    }
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
  function iPlus() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }

  return {
    state, init, render, navigate, changeMonth,
    openModal, closeModal, openEditTx, isDesktop
  };

})();

document.addEventListener('DOMContentLoaded', async function() { await ZApp.init(); });
