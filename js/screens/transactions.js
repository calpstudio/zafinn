/* ================================================
   ZAFINN - Tela de Lançamentos
   Desktop: tabela completa com filtros
   Mobile: lista agrupada por data
   ================================================ */

const ZTransactions = (function() {

  let activeFilter = 'all';

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const allTx = (data.months[month]?.transactions || []);

    const filtered = activeFilter === 'income' ? allTx.filter(t => t.type === 'income')
                   : activeFilter === 'expense' ? allTx.filter(t => t.type === 'expense')
                   : allTx;

    const totalIncome = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const txSorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

    return `
      <div class="screen-content">

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon">💵</div>
            <div class="kpi-label">Total de Receitas</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalIncome)}</div>
            <div class="kpi-sub">${allTx.filter(t => t.type === 'income').length} lançamentos</div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon">💸</div>
            <div class="kpi-label">Total de Despesas</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalExpense)}</div>
            <div class="kpi-sub">${allTx.filter(t => t.type === 'expense').length} lançamentos</div>
          </div>
          <div class="kpi-card balance ${balance < 0 ? 'negative' : ''}">
            <div class="kpi-icon">${balance >= 0 ? '💰' : '⚠️'}</div>
            <div class="kpi-label">Saldo Realizado</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(balance)}</div>
            <div class="kpi-sub">receitas − despesas</div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">🧮</div>
            <div class="kpi-label">Total de Lançamentos</div>
            <div class="kpi-value">${allTx.length}</div>
            <div class="kpi-sub">${filtered.length} exibidos</div>
          </div>
        </div>

        <!-- Tabela completa -->
        <div class="card">
          <div class="card-header">
            <h3>Lançamentos do Mês</h3>
            <div style="display:flex; gap:8px; align-items:center">
              <!-- Filtros em linha -->
              <div style="display:flex; gap:4px">
                ${['all', 'income', 'expense'].map(f => `
                  <button onclick="ZTransactions.setFilter('${f}')"
                    style="padding:6px 12px; border-radius:20px; border:1px solid ${activeFilter === f ? 'var(--primary)' : 'var(--border)'}; background:${activeFilter === f ? 'var(--primary)' : 'var(--card)'}; color:${activeFilter === f ? 'white' : 'var(--text-secondary)'}; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s">
                    ${f === 'all' ? 'Todos (' + allTx.length + ')' : f === 'income' ? '↑ Receitas (' + allTx.filter(t => t.type === 'income').length + ')' : '↓ Despesas (' + allTx.filter(t => t.type === 'expense').length + ')'}
                  </button>
                `).join('')}
              </div>
              <button class="header-action-btn" style="padding:7px 14px; font-size:12px; background:var(--bg); color:var(--text-secondary); border:1px solid var(--border)" onclick="ZApp.openModal('importTransactions', {month:'${month}'})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Importar
              </button>
              <button class="header-action-btn" style="padding:7px 14px; font-size:12px" onclick="ZApp.openModal('addTransaction', {month:'${month}'})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Novo Lançamento
              </button>
            </div>
          </div>

          ${txSorted.length === 0 ? `
            <div class="empty-state" style="padding:40px">
              <div class="empty-icon">💳</div>
              <h3>Nenhum lançamento encontrado</h3>
              <p>Use o botão <strong>+ Novo Lançamento</strong> para registrar uma receita ou despesa</p>
            </div>
          ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${txSorted.map(tx => {
                const cfg = ZUtils.getCatConfig(tx.category);
                return `
                <tr style="cursor:pointer" onclick="ZTransactions.openEdit('${tx.id}')">
                  <td>
                    <div style="display:flex; align-items:center; gap:10px">
                      <div class="tx-icon" style="background:${cfg.bg}; width:36px; height:36px; font-size:16px; border-radius:9px; flex-shrink:0">${cfg.emoji}</div>
                      <span style="font-weight:600">${tx.description}</span>
                    </div>
                  </td>
                  <td>
                    <span style="background:${cfg.bg}; color:${cfg.color}; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:600">${tx.category}</span>
                  </td>
                  <td style="color:var(--text-muted)">${tx.account || '—'}</td>
                  <td style="color:var(--text-muted)">${ZUtils.formatDate(tx.date)}</td>
                  <td>
                    <span style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:${tx.type === 'income' ? 'var(--success-light)' : 'var(--danger-light)'}; color:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                      ${tx.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </span>
                  </td>
                  <td style="font-weight:700; color:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-size:14px">
                    ${tx.type === 'income' ? '+' : '-'}${ZUtils.formatCurrencyShort(tx.amount)}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div style="padding:12px 12px; border-top:2px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:13px">
            <span style="color:var(--text-muted)">${txSorted.length} lançamentos exibidos</span>
            <div style="display:flex; gap:20px">
              <span>Receitas: <strong style="color:var(--success)">${ZUtils.formatCurrencyShort(totalIncome)}</strong></span>
              <span>Despesas: <strong style="color:var(--danger)">${ZUtils.formatCurrencyShort(totalExpense)}</strong></span>
              <span>Saldo: <strong style="color:${balance >= 0 ? 'var(--primary)' : 'var(--danger)'}">${ZUtils.formatCurrencyShort(balance)}</strong></span>
            </div>
          </div>`}
        </div>

      </div>
    `;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    const { data, month } = state;
    const allTx = (data.months[month]?.transactions || []);
    const monthName = ZUtils.getMonthName(month);

    const filtered = activeFilter === 'income' ? allTx.filter(t => t.type === 'income')
                   : activeFilter === 'expense' ? allTx.filter(t => t.type === 'expense')
                   : allTx;

    const groups = ZUtils.groupByDate(filtered);
    const totalIncome = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">${monthName}</div>
          <h1>Lançamentos</h1>
        </div>
        <div class="month-selector">
          <span>${ZUtils.getMonthNameShort(month)}</span>
          <button class="month-btn" onclick="ZApp.changeMonth(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="month-btn" onclick="ZApp.changeMonth(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="screen-content">

        <!-- Resumo rápido -->
        <div class="summary-grid">
          <div class="summary-card income">
            <div class="label">Receitas</div>
            <div class="value">${ZUtils.formatCurrencyShort(totalIncome)}</div>
            <div class="trend">${allTx.filter(t => t.type === 'income').length} lançamentos</div>
          </div>
          <div class="summary-card expense">
            <div class="label">Despesas</div>
            <div class="value">${ZUtils.formatCurrencyShort(totalExpense)}</div>
            <div class="trend">${allTx.filter(t => t.type === 'expense').length} lançamentos</div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="filter-tabs">
          <div class="filter-tab ${activeFilter === 'all' ? 'active' : ''}" onclick="ZTransactions.setFilter('all')">
            Todos (${allTx.length})
          </div>
          <div class="filter-tab ${activeFilter === 'income' ? 'active' : ''}" onclick="ZTransactions.setFilter('income')" style="${activeFilter === 'income' ? 'background:var(--success); border-color:var(--success)' : ''}">
            ↑ Receitas (${allTx.filter(t => t.type === 'income').length})
          </div>
          <div class="filter-tab ${activeFilter === 'expense' ? 'active' : ''}" onclick="ZTransactions.setFilter('expense')" style="${activeFilter === 'expense' ? 'background:var(--danger); border-color:var(--danger)' : ''}">
            ↓ Despesas (${allTx.filter(t => t.type === 'expense').length})
          </div>
        </div>

        <!-- Lista de transações -->
        ${groups.length === 0 ? `
          <div class="card">
            <div class="empty-state">
              <div class="empty-icon">💳</div>
              <h3>Nenhuma transação</h3>
              <p>Use o botão <strong>+</strong> abaixo para lançar uma receita ou despesa</p>
            </div>
          </div>
        ` : groups.map(([date, txs]) => {
          const dayTotal = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          return `
          <div class="transaction-group-header">
            <span>${formatGroupDate(date)}</span>
            <span style="float:right; color:${dayTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${dayTotal >= 0 ? '+' : ''}${ZUtils.formatCurrencyShort(dayTotal)}
            </span>
          </div>
          ${txs.map(tx => {
            const cfg = ZUtils.getCatConfig(tx.category);
            return `
            <div class="transaction-item" onclick="ZTransactions.openEdit('${tx.id}')">
              <div class="tx-icon" style="background:${cfg.bg}">${cfg.emoji}</div>
              <div class="tx-info">
                <div class="tx-desc">${tx.description}</div>
                <div class="tx-cat">${tx.category}${tx.account ? ' • ' + tx.account : ''}</div>
              </div>
              <div class="tx-right">
                <div class="tx-value ${tx.type}">${tx.type === 'income' ? '+' : '-'}${ZUtils.formatCurrencyShort(tx.amount)}</div>
              </div>
            </div>`;
          }).join('')}`;
        }).join('')}

        <div class="spacer-lg"></div>
      </div>

      <!-- Botão flutuante adicionar -->
      <button class="nav-center-btn" style="position:absolute; bottom:90px; right:16px; z-index:45"
        onclick="ZApp.openModal('addTransaction', {month:'${month}'})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    `;
  }

  function formatGroupDate(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Hoje · ' + ZUtils.formatDateShort(dateStr);
    if (dateStr === yesterday) return 'Ontem · ' + ZUtils.formatDateShort(dateStr);
    return ZUtils.formatDateFull(dateStr);
  }

  function setFilter(filter) {
    activeFilter = filter;
    ZApp.render();
  }

  function openEdit(txId) {
    ZApp.openModal('editTransaction', { txId, month: ZApp.state.month });
  }

  return { render, setFilter, openEdit };

})();
