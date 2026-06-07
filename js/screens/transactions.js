/* ================================================
   ZAFINN - Tela de Lançamentos
   Desktop: tabela completa com filtros
   Mobile: lista agrupada por data
   ================================================ */

const ZTransactions = (function() {

  let activeFilter = 'all';
  let selectMode = false;
  let selectedIds = new Set();

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     SELEÇÃO MÚLTIPLA
     ================================================ */
  function toggleSelectMode() {
    selectMode = !selectMode;
    selectedIds = new Set();
    ZApp.render();
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    ZApp.render();
  }

  function selectAll(ids) {
    const allSelected = ids.every(id => selectedIds.has(id));
    if (allSelected) ids.forEach(id => selectedIds.delete(id));
    else ids.forEach(id => selectedIds.add(id));
    ZApp.render();
  }

  async function deleteSelected() {
    const n = selectedIds.size;
    if (n === 0) return;
    if (!confirm(`Excluir ${n} lançamento${n > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`)) return;
    try {
      for (const id of selectedIds) await ZDB.deleteTransaction(id);
      const month = ZApp.state.month;
      const ids = [...selectedIds];
      ZApp.state.data.months[month].transactions =
        (ZApp.state.data.months[month]?.transactions || []).filter(t => !ids.includes(t.id));
      selectedIds = new Set();
      selectMode = false;
      ZApp.render();
    } catch(e) { alert('Erro ao excluir: ' + e.message); }
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const allTx = (data.months[month]?.transactions || []);
    const projected = _getProjected(data.recurringTemplates || [], month, data.months);

    const filtered = activeFilter === 'income' ? allTx.filter(t => t.type === 'income')
                   : activeFilter === 'expense' ? allTx.filter(t => t.type === 'expense')
                   : allTx;

    const totalIncome = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const txSorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const allIds = txSorted.map(t => t.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

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
              ${selectMode && selectedIds.size > 0 ? `
                <button onclick="ZTransactions.deleteSelected()"
                  style="padding:7px 14px; font-size:12px; background:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600">
                  Excluir ${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}
                </button>
              ` : ''}
              <button onclick="ZTransactions.toggleSelectMode()"
                style="padding:7px 14px; font-size:12px; background:${selectMode ? 'var(--bg)' : 'var(--bg)'}; color:${selectMode ? 'var(--danger)' : 'var(--text-secondary)'}; border:1px solid ${selectMode ? 'var(--danger)' : 'var(--border)'}; border-radius:8px; cursor:pointer; font-weight:600">
                ${selectMode ? 'Cancelar' : 'Selecionar'}
              </button>
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

          ${txSorted.length === 0 && projected.length === 0 ? `
            <div class="empty-state" style="padding:40px">
              <div class="empty-icon">💳</div>
              <h3>Nenhum lançamento encontrado</h3>
              <p>Use o botão <strong>+ Novo Lançamento</strong> para registrar uma receita ou despesa</p>
            </div>
          ` : `
          <table class="data-table">
            <thead>
              <tr>
                ${selectMode ? `<th style="width:40px; text-align:center"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="ZTransactions.selectAll([${allIds.map(id => `'${id}'`).join(',')}])" style="width:16px;height:16px;cursor:pointer"></th>` : ''}
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
                const isSelected = selectedIds.has(tx.id);
                return `
                <tr style="cursor:pointer; background:${isSelected ? 'rgba(99,102,241,0.08)' : ''}"
                    onclick="${selectMode ? `ZTransactions.toggleSelect('${tx.id}')` : `ZTransactions.openEdit('${tx.id}')`}">
                  ${selectMode ? `<td style="text-align:center" onclick="event.stopPropagation()"><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="ZTransactions.toggleSelect('${tx.id}')" style="width:16px;height:16px;cursor:pointer"></td>` : ''}
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
              ${projected.map(p => {
                const cfg = ZUtils.getCatConfig(p.category);
                return `
                <tr style="opacity:0.55">
                  ${selectMode ? '<td></td>' : ''}
                  <td>
                    <div style="display:flex; align-items:center; gap:10px">
                      <div class="tx-icon" style="background:${cfg.bg}; width:36px; height:36px; font-size:16px; border-radius:9px; flex-shrink:0">${cfg.emoji}</div>
                      <div>
                        <span style="font-weight:600">${p.description}</span>
                        <span style="display:block; font-size:11px; color:var(--text-muted)">${p.kind === 'installment' ? `Parcela ${p.installNum}/${p.total}` : 'Recorrente'}</span>
                      </div>
                    </div>
                  </td>
                  <td><span style="background:${cfg.bg}; color:${cfg.color}; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:600">${p.category}</span></td>
                  <td style="color:var(--text-muted)">${p.account || '—'}</td>
                  <td style="color:var(--text-muted)">—</td>
                  <td><span style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:var(--bg); color:var(--text-muted); border:1px dashed var(--border)">Previsto</span></td>
                  <td style="font-weight:700; color:var(--text-muted); font-size:14px">
                    -${ZUtils.formatCurrencyShort(p.amount)}
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
    const projected = _getProjected(data.recurringTemplates || [], month, data.months);
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
        <div style="display:flex; gap:8px; align-items:center">
          <button onclick="ZTransactions.toggleSelectMode()"
            style="padding:6px 14px; font-size:13px; font-weight:600; background:${selectMode ? 'var(--danger-light)' : 'var(--bg)'}; color:${selectMode ? 'var(--danger)' : 'var(--text-secondary)'}; border:1px solid ${selectMode ? 'var(--danger)' : 'var(--border)'}; border-radius:20px; cursor:pointer">
            ${selectMode ? 'Cancelar' : 'Selecionar'}
          </button>
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

        <!-- Botão importar -->
        <button onclick="ZApp.openModal('importTransactions', {month:'${month}'})"
          style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:11px; background:var(--card); border:1px dashed var(--border); border-radius:var(--radius-sm); color:var(--text-secondary); font-size:13px; font-weight:600; cursor:pointer; margin-bottom:4px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importar Extrato / Fatura
        </button>

        <!-- Lista de transações -->
        ${groups.length === 0 && projected.length === 0 ? `
          <div class="card">
            <div class="empty-state">
              <div class="empty-icon">💳</div>
              <h3>Nenhuma transação</h3>
              <p>Use o botão <strong>+</strong> abaixo para lançar uma receita ou despesa</p>
            </div>
          </div>
        ` : ''}
        ${projected.length > 0 ? `
          <div style="margin-bottom:4px; padding:0 2px">
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px">Previstos</div>
            ${projected.map(p => {
              const cfg = ZUtils.getCatConfig(p.category);
              return `
              <div class="transaction-item" style="opacity:0.6; border-style:dashed">
                <div class="tx-icon" style="background:${cfg.bg}">${cfg.emoji}</div>
                <div class="tx-info">
                  <div class="tx-desc">${p.description}</div>
                  <div class="tx-cat">${p.kind === 'installment' ? `Parcela ${p.installNum}/${p.total}` : 'Recorrente'}</div>
                </div>
                <div class="tx-right">
                  <div class="tx-value expense">-${ZUtils.formatCurrencyShort(p.amount)}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        ${groups.length > 0 ? groups.map(([date, txs]) => {
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
            const isSelected = selectedIds.has(tx.id);
            return `
            <div class="transaction-item${isSelected ? ' tx-selected' : ''}"
                 style="${isSelected ? 'background:rgba(99,102,241,0.1); border-color:var(--primary)' : ''}"
                 onclick="${selectMode ? `ZTransactions.toggleSelect('${tx.id}')` : `ZTransactions.openEdit('${tx.id}')`}">
              ${selectMode ? `
                <div style="display:flex; align-items:center; padding-right:10px">
                  <div style="width:22px; height:22px; border-radius:6px; border:2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; background:${isSelected ? 'var(--primary)' : 'transparent'}; display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    ${isSelected ? '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="14"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                  </div>
                </div>
              ` : ''}
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
        }).join('') : ''}

        <div class="spacer-lg"></div>
      </div>

      <!-- Barra de ação ao selecionar (mobile) -->
      ${selectMode ? `
        <div style="position:fixed; bottom:80px; left:0; right:0; z-index:50; padding:0 16px">
          <div style="background:var(--card); border:1px solid var(--border); border-radius:16px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 20px rgba(0,0,0,0.15)">
            <span style="font-size:14px; font-weight:600; color:var(--text-secondary)">
              ${selectedIds.size === 0 ? 'Nenhum selecionado' : `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}`}
            </span>
            <div style="display:flex; gap:8px">
              <button onclick="ZTransactions.selectAll([${filtered.map(t => `'${t.id}'`).join(',')}])"
                style="padding:8px 14px; font-size:13px; font-weight:600; background:var(--bg); color:var(--text-secondary); border:1px solid var(--border); border-radius:10px; cursor:pointer">
                ${filtered.every(t => selectedIds.has(t.id)) && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <button onclick="ZTransactions.deleteSelected()"
                ${selectedIds.size === 0 ? 'disabled' : ''}
                style="padding:8px 14px; font-size:13px; font-weight:600; background:${selectedIds.size > 0 ? 'var(--danger)' : 'var(--bg)'}; color:${selectedIds.size > 0 ? 'white' : 'var(--text-muted)'}; border:none; border-radius:10px; cursor:${selectedIds.size > 0 ? 'pointer' : 'default'}; opacity:${selectedIds.size > 0 ? '1' : '0.5'}">
                Excluir
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Botão flutuante adicionar -->
      ${!selectMode ? `
        <button class="nav-center-btn" style="position:absolute; bottom:90px; right:16px; z-index:45"
          onclick="ZApp.openModal('addTransaction', {month:'${month}'})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      ` : ''}
    `;
  }

  function _mdiff(from, to) {
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm);
  }

  function _getProjected(templates, month, allMonths) {
    const result = [];

    // Prioridade 1: templates salvos no banco
    (templates || []).forEach(t => {
      if (!t.is_active) return;
      if (month <= t.last_created_month) return;
      if (month < t.start_month) return;
      if (t.kind === 'installment') {
        const installNum = _mdiff(t.start_month, month) + 1;
        if (installNum > t.total_installments) return;
        result.push({ ...t, installNum, total: t.total_installments,
          description: `${t.description} ${installNum}/${t.total_installments}` });
      } else {
        result.push({ ...t });
      }
    });

    // Fallback: infere parcelas de transações existentes (padrão "Desc X/N")
    if (result.length === 0 && allMonths) {
      const seen = new Set();
      const pattern = /^(.+)\s(\d+)\/(\d+)$/;
      Object.entries(allMonths).forEach(([txMonth, monthData]) => {
        (monthData.transactions || []).forEach(tx => {
          const m = tx.description?.match(pattern);
          if (!m) return;
          const [, base, numStr, totalStr] = m;
          const key = `${base}/${totalStr}/${tx.amount}`;
          if (seen.has(key)) return;
          seen.add(key);
          const currentNum = parseInt(numStr);
          const total = parseInt(totalStr);
          if (isNaN(currentNum) || isNaN(total) || total <= 1) return;
          const [ty, tm] = txMonth.split('-').map(Number);
          const sd = new Date(ty, tm - 1 - (currentNum - 1), 1);
          const startMonth = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}`;
          const installNum = _mdiff(startMonth, month) + 1;
          if (installNum <= 0 || installNum > total) return;
          if (installNum === currentNum && txMonth === month) return;
          result.push({ description: `${base} ${installNum}/${total}`,
            amount: tx.amount, type: tx.type, category: tx.category,
            account: tx.account || '', kind: 'installment', installNum, total });
        });
      });
    }

    return result;
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

  return { render, setFilter, openEdit, toggleSelectMode, toggleSelect, selectAll, deleteSelected };

})();
