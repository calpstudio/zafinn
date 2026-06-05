/* ================================================
   ZAFINN - Tela de Fluxo Futuro
   Desktop: grid de projeções + tabela de itens
   Mobile: cards expansíveis + lista
   ================================================ */

const ZCashflow = (function() {

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const futureItems = data.futureItems || [];
    const projections = ZUtils.getFutureProjections(data, month, 6);
    const hasData = projections.some(p => p.income > 0 || p.expense > 0);

    const incomeItems = futureItems.filter(f => f.type === 'income' && f.status === 'active');
    const expenseItems = futureItems.filter(f => f.type === 'expense' && f.status === 'active');
    const totalFutureIncome = incomeItems.reduce((s, f) => s + f.totalValue, 0);
    const totalFutureExpense = expenseItems.reduce((s, f) => s + f.totalValue, 0);

    return `
      <div class="screen-content">

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon">📈</div>
            <div class="kpi-label">A Receber (total)</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalFutureIncome)}</div>
            <div class="kpi-sub">${incomeItems.length} itens ativos</div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon">📉</div>
            <div class="kpi-label">A Pagar (total)</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalFutureExpense)}</div>
            <div class="kpi-sub">${expenseItems.length} itens ativos</div>
          </div>
          <div class="kpi-card balance ${projections.reduce((s,p)=>s+p.balance,0) < 0 ? 'negative' : ''}">
            <div class="kpi-icon">🔮</div>
            <div class="kpi-label">Saldo Próximo Mês</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(projections[0]?.balance || 0)}</div>
            <div class="kpi-sub">${ZUtils.getMonthName(projections[0]?.month || month)}</div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">📅</div>
            <div class="kpi-label">Itens Cadastrados</div>
            <div class="kpi-value">${futureItems.length}</div>
            <div class="kpi-sub">parcelas e recebimentos</div>
          </div>
        </div>

        <!-- Projeções em grid (6 meses) -->
        <div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3>Projeção — Próximos 6 Meses</h3>
            <button class="header-action-btn" style="padding:7px 14px; font-size:12px" onclick="ZApp.openModal('addFutureItem', {})">
              + Novo Item
            </button>
          </div>

          ${!hasData ? `
            <div class="empty-state" style="padding:30px">
              <div class="empty-icon">📅</div>
              <h3>Nenhuma projeção</h3>
              <p>Cadastre parcelas, financiamentos e recebimentos futuros para visualizar o fluxo</p>
            </div>
          ` : `
          <div class="triple-row" style="margin-bottom:0">
            ${projections.map(p => `
              <div style="padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); background:${p.balance < 0 ? 'var(--danger-light)' : p.balance === 0 ? 'var(--bg)' : 'var(--success-light)'}">
                <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:8px">
                  ${ZUtils.getMonthName(p.month)}
                </div>
                <div style="font-size:22px; font-weight:800; color:${p.balance < 0 ? 'var(--danger)' : 'var(--success)'}; margin-bottom:10px; letter-spacing:-0.5px">
                  ${p.balance >= 0 ? '+' : ''}${ZUtils.formatCurrencyShort(p.balance)}
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; font-size:12px">
                  <div style="display:flex; justify-content:space-between">
                    <span style="color:var(--text-muted)">↑ Receitas</span>
                    <span style="font-weight:600; color:var(--success)">${ZUtils.formatCurrencyShort(p.income)}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between">
                    <span style="color:var(--text-muted)">↓ Despesas</span>
                    <span style="font-weight:600; color:var(--danger)">${ZUtils.formatCurrencyShort(p.expense)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`}
        </div>

        <!-- Itens cadastrados lado a lado -->
        <div class="equal-row">

          <!-- A receber -->
          <div class="card">
            <div class="card-header">
              <h3>↑ A Receber</h3>
              <span class="badge badge-green">${incomeItems.length} itens</span>
            </div>
            ${incomeItems.length === 0 ? `
              <div class="empty-state" style="padding:20px">
                <p>Nenhum recebimento futuro cadastrado</p>
                <button class="btn btn-primary" style="margin-top:10px; padding:7px 14px; font-size:12px; border:none; border-radius:var(--radius-sm); color:white; cursor:pointer; background:var(--primary)" onclick="ZApp.openModal('addFutureItem', {})">+ Adicionar</button>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor Parcela</th>
                  <th>Parcelas</th>
                  <th>Total</th>
                  <th>Período</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${incomeItems.map(f => `
                <tr>
                  <td style="font-weight:600">${f.description}</td>
                  <td style="color:var(--success); font-weight:600">${ZUtils.formatCurrencyShort(f.installmentValue)}</td>
                  <td style="color:var(--text-muted)">${f.totalInstallments}x</td>
                  <td style="font-weight:700; color:var(--success)">${ZUtils.formatCurrencyShort(f.totalValue)}</td>
                  <td style="color:var(--text-muted); font-size:11px">${ZUtils.formatDate(f.startDate)} → ${ZUtils.formatDate(f.endDate)}</td>
                  <td>
                    <button class="btn-icon" onclick="ZCashflow.deleteItem('${f.id}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>

          <!-- A pagar -->
          <div class="card">
            <div class="card-header">
              <h3>↓ A Pagar</h3>
              <span class="badge badge-red">${expenseItems.length} itens</span>
            </div>
            ${expenseItems.length === 0 ? `
              <div class="empty-state" style="padding:20px">
                <p>Nenhuma parcela ou despesa futura cadastrada</p>
                <button class="btn btn-primary" style="margin-top:10px; padding:7px 14px; font-size:12px; border:none; border-radius:var(--radius-sm); color:white; cursor:pointer; background:var(--primary)" onclick="ZApp.openModal('addFutureItem', {})">+ Adicionar</button>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor Parcela</th>
                  <th>Parcelas</th>
                  <th>Total</th>
                  <th>Período</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${expenseItems.map(f => `
                <tr>
                  <td style="font-weight:600">${f.description}</td>
                  <td style="color:var(--danger); font-weight:600">${ZUtils.formatCurrencyShort(f.installmentValue)}</td>
                  <td style="color:var(--text-muted)">${f.totalInstallments}x</td>
                  <td style="font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(f.totalValue)}</td>
                  <td style="color:var(--text-muted); font-size:11px">${ZUtils.formatDate(f.startDate)} → ${ZUtils.formatDate(f.endDate)}</td>
                  <td>
                    <button class="btn-icon" onclick="ZCashflow.deleteItem('${f.id}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>

      </div>
    `;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    const { data, month } = state;
    const futureItems = data.futureItems || [];
    const projections = ZUtils.getFutureProjections(data, month, 6);

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Projeções</div>
          <h1>Fluxo Futuro</h1>
        </div>
        <button style="background:var(--primary); border:none; border-radius:var(--radius-sm); padding:8px 12px; color:white; font-size:12px; font-weight:700; cursor:pointer"
          onclick="ZApp.openModal('addFutureItem', {})">
          + Novo
        </button>
      </div>

      <div class="screen-content">
        <div class="spacer-sm"></div>

        <div class="section-header"><h2>Projeção dos Próximos Meses</h2></div>

        ${projections.every(p => p.income === 0 && p.expense === 0) ? `
          <div class="card" style="margin-top:0">
            <div class="empty-state">
              <div class="empty-icon">📅</div>
              <h3>Nenhum item futuro</h3>
              <p>Cadastre parcelas, empréstimos e recebimentos futuros para ver a projeção</p>
            </div>
          </div>
        ` : projections.map(p => `
          <div class="future-month-card">
            <div class="fmc-header" onclick="this.nextElementSibling.classList.toggle('open')">
              <div class="fmc-month">${p.name}</div>
              <div class="fmc-balance" style="color:${p.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${p.balance >= 0 ? '+' : ''}${ZUtils.formatCurrencyShort(p.balance)}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" style="margin-left:8px; color:var(--text-muted)"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="fmc-body">
              <div class="fmc-row"><span class="fcr-label">↑ Receitas previstas</span><span class="fcr-value text-success">${ZUtils.formatCurrency(p.income)}</span></div>
              <div class="fmc-row"><span class="fcr-label">↓ Despesas previstas</span><span class="fcr-value text-danger">${ZUtils.formatCurrency(p.expense)}</span></div>
              <div class="fmc-row" style="font-weight:700"><span class="fcr-label">⚖️ Saldo projetado</span><span class="fcr-value" style="color:${p.balance >= 0 ? 'var(--primary)' : 'var(--danger)'}">${ZUtils.formatCurrency(p.balance)}</span></div>
            </div>
          </div>
        `).join('')}

        <div class="section-header"><h2>Parcelas e Recebimentos</h2></div>

        ${futureItems.length === 0 ? `
          <div class="card" style="margin-top:0">
            <div class="empty-state" style="padding:24px"><p>Nenhum item cadastrado ainda</p></div>
          </div>
        ` : `
        <div style="margin:0 16px; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
          ${futureItems.map(f => {
            const cfg = f.type === 'income' ?
              { emoji: '↑', color: 'var(--success)', bg: 'var(--success-light)', label: 'A Receber' } :
              { emoji: '↓', color: 'var(--danger)', bg: 'var(--danger-light)', label: 'A Pagar' };
            return `
            <div style="padding:14px 16px; border-bottom:1px solid var(--border-light)">
              <div style="display:flex; align-items:center; gap:10px">
                <div style="width:36px; height:36px; background:${cfg.bg}; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:${cfg.color}; flex-shrink:0">${cfg.emoji}</div>
                <div style="flex:1">
                  <div style="font-size:13px; font-weight:700">${f.description}</div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px">
                    ${f.totalInstallments}x de ${ZUtils.formatCurrencyShort(f.installmentValue)} · ${ZUtils.formatDate(f.startDate)} → ${ZUtils.formatDate(f.endDate)}
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:13px; font-weight:700; color:${cfg.color}">${ZUtils.formatCurrencyShort(f.totalValue)}</div>
                  <div style="font-size:10px; color:var(--text-muted)">${cfg.label}</div>
                </div>
                <button class="btn-icon" onclick="ZCashflow.deleteItem('${f.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>`}

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  async function deleteItem(id) {
    if (!confirm('Remover este item?')) return;
    try {
      await ZDB.deleteFutureItem(id);
      ZApp.state.data.futureItems = ZApp.state.data.futureItems.filter(f => f.id !== id);
      ZApp.render();
    } catch(e) { alert(e.message); }
  }

  return { render, deleteItem };

})();
