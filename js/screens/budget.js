/* ================================================
   ZAFINN - Tela de Orçamento
   Desktop: receitas e despesas lado a lado
   Mobile: seções expansíveis empilhadas
   ================================================ */

const ZBudget = (function() {

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const monthData = data.months[month] || { budget: { incomes: [], expenses: [] }, transactions: [] };
    const budget = monthData.budget;
    const incomes = budget.incomes || [];
    const expenses = budget.expenses || [];
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenses.reduce((s, i) => s + i.amount, 0);
    const balance = totalIncome - totalExpense;

    const expensesByCat = {};
    expenses.forEach(e => {
      if (!expensesByCat[e.category]) expensesByCat[e.category] = [];
      expensesByCat[e.category].push(e);
    });

    return `
      <div class="screen-content">

        <!-- KPI rápidos -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon">💵</div>
            <div class="kpi-label">Receitas Previstas</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalIncome)}</div>
            <div class="kpi-sub">${incomes.length} itens planejados</div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon">💸</div>
            <div class="kpi-label">Despesas Previstas</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totalExpense)}</div>
            <div class="kpi-sub">${expenses.length} itens planejados</div>
          </div>
          <div class="kpi-card balance ${balance < 0 ? 'negative' : ''}">
            <div class="kpi-icon">${balance >= 0 ? '⚖️' : '⚠️'}</div>
            <div class="kpi-label">Saldo Previsto</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(balance)}</div>
            <div class="kpi-sub" style="color:${balance < 0 ? 'var(--danger)' : 'var(--success)'}">
              ${balance >= 0 ? 'Orçamento equilibrado' : 'Revise as despesas'}
            </div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">📊</div>
            <div class="kpi-label">Comprometimento</div>
            <div class="kpi-value" style="color:${totalIncome > 0 && totalExpense / totalIncome > 0.9 ? 'var(--danger)' : 'var(--text)'}">
              ${totalIncome > 0 ? ZUtils.pct(totalExpense, totalIncome) + '%' : '—'}
            </div>
            <div class="kpi-sub">da receita comprometida</div>
          </div>
        </div>

        <!-- Receitas e Despesas lado a lado -->
        <div class="equal-row">

          <!-- Coluna Receitas -->
          <div class="card">
            <div class="card-header">
              <h3>💵 Receitas Previstas</h3>
              <span class="badge badge-green">${ZUtils.formatCurrencyShort(totalIncome)}</span>
            </div>

            ${incomes.length === 0 ? `
              <div class="empty-state" style="padding:20px">
                <div class="empty-icon">💵</div>
                <p>Nenhuma receita planejada</p>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${incomes.map(item => {
                  const cfg = ZUtils.getCatConfig(item.category);
                  return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <span style="background:${cfg.bg}; padding:3px 7px; border-radius:6px; font-size:13px">${cfg.emoji}</span>
                        <span style="font-weight:600">${item.name}</span>
                      </div>
                    </td>
                    <td style="color:var(--text-muted)">${item.category}</td>
                    <td style="font-weight:700; color:var(--success)">${ZUtils.formatCurrency(item.amount)}</td>
                    <td>
                      <button class="btn-icon" onclick="ZBudget.deleteBudgetItem('incomes','${item.id}')" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}

            <button class="btn-add-item" style="margin-top:12px" onclick="ZApp.openModal('addBudgetItem', {type:'incomes', month:'${month}'})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Adicionar Receita
            </button>
          </div>

          <!-- Coluna Despesas -->
          <div class="card">
            <div class="card-header">
              <h3>💸 Despesas Previstas</h3>
              <span class="badge badge-red">${ZUtils.formatCurrencyShort(totalExpense)}</span>
            </div>

            ${expenses.length === 0 ? `
              <div class="empty-state" style="padding:20px">
                <div class="empty-icon">💸</div>
                <p>Nenhuma despesa planejada</p>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>${totalIncome > 0 ? '% Renda' : 'Valor'}</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${expenses.map(item => {
                  const cfg = ZUtils.getCatConfig(item.category);
                  const pct = totalIncome > 0 ? ZUtils.pct(item.amount, totalIncome) : null;
                  const bench = data.benchmarks[item.category];
                  const isOver = bench && pct !== null && pct > bench.max;
                  return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <span style="background:${cfg.bg}; padding:3px 7px; border-radius:6px; font-size:13px">${cfg.emoji}</span>
                        <span style="font-weight:600">${item.name}</span>
                      </div>
                    </td>
                    <td style="color:var(--text-muted)">${item.category}</td>
                    <td>${pct !== null ? `<span style="color:${isOver ? 'var(--danger)' : 'var(--text-secondary)'}; font-weight:600">${pct}%</span>` : '—'}</td>
                    <td style="font-weight:700">${ZUtils.formatCurrency(item.amount)}</td>
                    <td>
                      <button class="btn-icon" onclick="ZBudget.deleteBudgetItem('expenses','${item.id}')" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}

            <button class="btn-add-item" style="margin-top:12px" onclick="ZApp.openModal('addBudgetItem', {type:'expenses', month:'${month}'})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Adicionar Despesa
            </button>
          </div>
        </div>

        ${balance < 0 ? `
        <div class="budget-alert" style="margin-bottom:20px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="budget-alert-text">Seu orçamento está <strong>${ZUtils.formatCurrency(Math.abs(balance))}</strong> acima da sua receita. Revise as despesas ou adicione novas receitas.</div>
        </div>` : ''}

        <!-- Distribuição e Gabarito lado a lado -->
        <div class="equal-row">

          <!-- Distribuição das despesas -->
          <div class="card">
            <div class="card-header">
              <h3>Distribuição das Despesas</h3>
              <span style="font-size:11px; color:var(--text-muted)">% sobre receita</span>
            </div>
            ${Object.keys(expensesByCat).length === 0 ? `
              <div class="empty-state" style="padding:16px">
                <p>Nenhuma despesa planejada</p>
              </div>
            ` : Object.entries(expensesByCat).map(([cat, items]) => {
              const catTotal = items.reduce((s, i) => s + i.amount, 0);
              const pct = totalIncome > 0 ? ZUtils.pct(catTotal, totalIncome) : 0;
              const cfg = ZUtils.getCatConfig(cat);
              const bench = data.benchmarks[cat];
              const isOver = bench && pct > bench.max;
              return `
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label" style="display:flex; align-items:center; gap:6px">
                    <span style="width:8px; height:8px; border-radius:50%; background:${cfg.color}; display:inline-block; flex-shrink:0"></span>
                    ${cfg.emoji} ${cat}
                    ${isOver ? '<span class="badge badge-red" style="font-size:10px; padding:1px 5px">⚠️</span>' : ''}
                  </span>
                  <span class="prog-value">${ZUtils.formatCurrencyShort(catTotal)} <span style="color:var(--text-muted)">(${pct}%)</span></span>
                </div>
                <div class="progress-bar" style="height:6px">
                  <div class="fill" style="width:${Math.min(pct, 100)}%; background:${isOver ? 'var(--danger)' : cfg.color}"></div>
                </div>
                ${bench ? `<div style="font-size:10px; color:var(--text-muted); margin-top:2px">Ideal: ${bench.min}–${bench.max}%</div>` : ''}
              </div>`;
            }).join('')}
          </div>

          <!-- Gabarito financeiro -->
          <div class="card">
            <div class="card-header">
              <h3>Gabarito Financeiro</h3>
              <button class="card-action" onclick="ZApp.navigate('settings')">Editar</button>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px; line-height:1.5">
              Compare com os percentuais ideais. A barra mostra o intervalo ideal e seu gasto atual.
            </div>
            ${Object.entries(data.benchmarks).slice(0, 7).map(([cat, bench]) => {
              const catTotal = (budget.expenses || []).filter(e => e.category === cat).reduce((s, i) => s + i.amount, 0);
              const actual = totalIncome > 0 ? ZUtils.pct(catTotal, totalIncome) : 0;
              const cfg = ZUtils.getCatConfig(cat);
              const isOver = actual > bench.max;
              return `
              <div class="benchmark-item">
                <div class="bench-header">
                  <div class="bench-cat">${cfg.emoji} ${cat}</div>
                  <div class="bench-values">
                    Ideal: ${bench.min}–${bench.max}% · Seu: <strong style="color:${isOver ? 'var(--danger)' : actual > 0 ? 'var(--success)' : 'var(--text-muted)'}">${actual}%</strong>
                  </div>
                </div>
                <div class="bench-track">
                  <div class="bench-ideal" style="left:${bench.min}%; width:${bench.max - bench.min}%; background:${cfg.color}"></div>
                  <div class="bench-actual" style="width:${Math.min(actual, 100)}%; background:${isOver ? 'var(--danger)' : cfg.color}"></div>
                </div>
              </div>`;
            }).join('')}
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
    const monthData = data.months[month] || { budget: { incomes: [], expenses: [] }, transactions: [] };
    const budget = monthData.budget;
    const incomes = budget.incomes || [];
    const expenses = budget.expenses || [];
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenses.reduce((s, i) => s + i.amount, 0);
    const balance = totalIncome - totalExpense;
    const monthName = ZUtils.getMonthName(month);

    const expensesByCat = {};
    expenses.forEach(e => {
      if (!expensesByCat[e.category]) expensesByCat[e.category] = [];
      expensesByCat[e.category].push(e);
    });

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Planejamento</div>
          <h1>Orçamento</h1>
        </div>
        <div class="month-selector">
          <span>${monthName}</span>
          <button class="month-btn" onclick="ZApp.changeMonth(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="month-btn" onclick="ZApp.changeMonth(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="screen-content">
        <div class="spacer-sm"></div>

        <!-- Seção: Receitas -->
        <div class="budget-section">
          <div class="budget-section-header" onclick="ZBudget.toggleSection('incomes')">
            <div class="bsh-left">
              <div class="bsh-icon income">💵</div>
              <div>
                <div class="bsh-title">Receitas Previstas</div>
                <div class="bsh-count">${incomes.length} ${incomes.length === 1 ? 'item' : 'itens'}</div>
              </div>
            </div>
            <div class="bsh-right">
              <div class="bsh-total income">${ZUtils.formatCurrencyShort(totalIncome)}</div>
            </div>
            <svg class="bsh-arrow" id="arrow-incomes" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="budget-items" id="section-incomes">
            ${incomes.map(item => {
              const cfg = ZUtils.getCatConfig(item.category);
              return `
              <div class="budget-item">
                <div class="cat-icon" style="background:${cfg.bg}; width:32px; height:32px; font-size:15px; border-radius:8px">${cfg.emoji}</div>
                <div style="flex:1; min-width:0">
                  <div class="bi-name">${item.name}</div>
                  <div class="bi-cat" style="color:${cfg.color}">${item.category}</div>
                </div>
                <div class="bi-value text-success">${ZUtils.formatCurrency(item.amount)}</div>
                <div class="bi-actions">
                  <button class="btn-icon" onclick="ZBudget.deleteBudgetItem('incomes','${item.id}')" title="Excluir">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>`;
            }).join('')}
            <button class="btn-add-item" onclick="ZApp.openModal('addBudgetItem', {type:'incomes', month:'${month}'})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Adicionar Receita
            </button>
          </div>
        </div>

        <!-- Seção: Despesas -->
        <div class="budget-section">
          <div class="budget-section-header" onclick="ZBudget.toggleSection('expenses')">
            <div class="bsh-left">
              <div class="bsh-icon expense">💸</div>
              <div>
                <div class="bsh-title">Despesas Previstas</div>
                <div class="bsh-count">${expenses.length} ${expenses.length === 1 ? 'item' : 'itens'}</div>
              </div>
            </div>
            <div class="bsh-right">
              <div class="bsh-total expense">${ZUtils.formatCurrencyShort(totalExpense)}</div>
            </div>
            <svg class="bsh-arrow" id="arrow-expenses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="budget-items" id="section-expenses">
            ${expenses.length === 0 ? `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px">Nenhuma despesa planejada ainda</div>` : ''}
            ${Object.entries(expensesByCat).map(([cat, items]) => {
              const cfg = ZUtils.getCatConfig(cat);
              const catTotal = items.reduce((s, i) => s + i.amount, 0);
              const pct = totalIncome > 0 ? ZUtils.pct(catTotal, totalIncome) : 0;
              const bench = data.benchmarks[cat];
              const overBench = bench && pct > bench.max;
              return `
              <div style="border-top:1px solid var(--border-light); padding:10px 16px 4px">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px">
                  <div style="display:flex; align-items:center; gap:8px">
                    <span style="background:${cfg.bg}; padding:4px 8px; border-radius:6px; font-size:13px">${cfg.emoji} ${cat}</span>
                    ${overBench ? `<span class="badge badge-orange">⚠️ ${pct}%</span>` : pct > 0 ? `<span class="badge badge-blue">${pct}%</span>` : ''}
                  </div>
                  <span style="font-size:13px; font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(catTotal)}</span>
                </div>
                ${items.map(item => `
                <div class="budget-item" style="padding:8px 0">
                  <div style="flex:1; min-width:0"><div class="bi-name" style="font-size:13px">${item.name}</div></div>
                  <div class="bi-value" style="font-size:13px">${ZUtils.formatCurrency(item.amount)}</div>
                  <div class="bi-actions">
                    <button class="btn-icon" onclick="ZBudget.deleteBudgetItem('expenses','${item.id}')" title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>`).join('')}
              </div>`;
            }).join('')}
            <button class="btn-add-item" onclick="ZApp.openModal('addBudgetItem', {type:'expenses', month:'${month}'})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Adicionar Despesa
            </button>
          </div>
        </div>

        ${balance < 0 ? `
        <div class="budget-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="budget-alert-text">Seu orçamento está <strong>${ZUtils.formatCurrency(Math.abs(balance))}</strong> acima da sua receita.</div>
        </div>` : ''}

        <!-- Rodapé com totais -->
        <div class="budget-footer">
          <div class="budget-footer-row">
            <span class="bfr-label">💵 Total de Receitas</span>
            <span class="bfr-value income">${ZUtils.formatCurrency(totalIncome)}</span>
          </div>
          <div class="budget-footer-row">
            <span class="bfr-label">💸 Total de Despesas</span>
            <span class="bfr-value expense">${ZUtils.formatCurrency(totalExpense)}</span>
          </div>
          <div class="budget-footer-row total">
            <span class="bfr-label">⚖️ Saldo Previsto</span>
            <span class="bfr-value ${balance >= 0 ? 'positive' : 'negative'}">${ZUtils.formatCurrency(balance)}</span>
          </div>
        </div>

        <!-- Gabarito financeiro -->
        <div class="section-header"><h2>Gabarito Financeiro</h2><button class="see-all" onclick="ZApp.navigate('settings')">Editar</button></div>
        <div class="card" style="margin-top:0">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.4">
            Barras mostram o intervalo ideal 🔵 e seu gasto atual 🟢.
          </div>
          ${Object.entries(data.benchmarks).slice(0, 6).map(([cat, bench]) => {
            const catTotal = (budget.expenses || []).filter(e => e.category === cat).reduce((s, i) => s + i.amount, 0);
            const actual = totalIncome > 0 ? ZUtils.pct(catTotal, totalIncome) : 0;
            const cfg = ZUtils.getCatConfig(cat);
            const isOver = actual > bench.max;
            return `
            <div class="benchmark-item">
              <div class="bench-header">
                <div class="bench-cat">${cfg.emoji} ${cat}</div>
                <div class="bench-values">Ideal: ${bench.min}–${bench.max}% · Seu: <strong style="color:${isOver ? 'var(--danger)' : 'var(--success)'}">${actual}%</strong></div>
              </div>
              <div class="bench-track">
                <div class="bench-ideal" style="left:${bench.min}%; width:${bench.max - bench.min}%; background:${cfg.color}"></div>
                <div class="bench-actual" style="width:${Math.min(actual, 100)}%; background:${isOver ? 'var(--danger)' : cfg.color}"></div>
              </div>
            </div>`;
          }).join('')}
        </div>

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  function toggleSection(sectionId) {
    const el = document.getElementById(`section-${sectionId}`);
    const arrow = document.getElementById(`arrow-${sectionId}`);
    if (!el) return;
    const isOpen = el.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open', isOpen);
  }

  async function deleteBudgetItem(type, id) {
    if (!confirm('Remover este item do orçamento?')) return;
    try {
      await ZDB.deleteBudgetItem(id);
      const month = ZApp.state.month;
      if (ZApp.state.data.months[month]) {
        ZApp.state.data.months[month].budget[type] = ZApp.state.data.months[month].budget[type].filter(i => i.id !== id);
      }
      ZApp.render();
      if (!ZApp.isDesktop()) {
        setTimeout(() => { const el = document.getElementById(`section-${type}`); if (el) el.classList.add('open'); }, 50);
      }
    } catch(e) { alert(e.message); }
  }

  return { render, toggleSection, deleteBudgetItem };

})();
