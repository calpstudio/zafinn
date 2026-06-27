/* ================================================
   ZAFINN - Dashboard
   Desktop: grid 4 KPIs + gráficos + tabela
   Mobile: cards empilhados
   ================================================ */

const ZDashboard = (function() {

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  function _setupBanner(state, totals, hasRealIncome) {
    const hasIncome  = hasRealIncome;
    const hasExpense = totals.realExpense > 0;
    const hasBudget  = totals.budgetExpense > 0;
    const hasCards   = (state.data.creditCards || []).length > 0;
    if (hasIncome && hasBudget) return '';

    const steps = [
      { label: 'Cartões',   done: hasCards,   action: "ZApp.navigate('cards')" },
      { label: 'Despesas',  done: hasExpense,  action: "ZApp.navigate('transactions')" },
      { label: 'Receitas',  done: hasIncome,   action: "ZApp.openModal('addTransaction', {type:'income'})" },
      { label: 'Orçamento', done: hasBudget,   action: "ZApp.navigate('budget')" },
    ];

    return `
      <div style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE); border:1px solid #BFDBFE; border-left:4px solid #3B82F6; border-radius:12px; padding:14px 16px; margin-bottom:16px">
        <div style="font-size:13px; font-weight:700; color:#1E40AF; margin-bottom:10px">📋 Configure seu mês</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          ${steps.map(s => `
            <button onclick="${s.done ? '' : s.action}"
              style="display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:20px; border:1px solid ${s.done ? '#BBF7D0' : '#BFDBFE'}; background:${s.done ? '#DCFCE7' : 'white'}; color:${s.done ? '#166534' : '#1D4ED8'}; font-size:12px; font-weight:600; cursor:${s.done ? 'default' : 'pointer'}">
              ${s.done ? '✓' : '+'} ${s.label}
            </button>
          `).join('')}
        </div>
        ${!hasIncome ? `<div style="font-size:11px; color:#3B82F6; margin-top:8px">💡 Adicione suas receitas para ver % poupado, diagnóstico e análise completa</div>` : ''}
      </div>
    `;
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const totals = ZData.getMonthTotals(data, month);
    const catReal = ZData.getCategoryTotals(data, month);
    const catBudget = ZData.getBudgetByCategory(data, month);
    const netWorth = ZData.getNetWorth(data);
    const recentTx = (data.months[month]?.transactions || []).slice(0, 8);
    const diagnosis = ZUtils.generateDiagnosis(data, month);

    // Receita real = income adicionado manualmente (não importado de fatura)
    const realSalaryIncome = (data.months[month]?.transactions || [])
      .filter(t => t.type === 'income' && t.notes !== 'Importado')
      .reduce((s, t) => s + t.amount, 0);
    const hasRealIncome = realSalaryIncome > 0;

    const balance = totals.realIncome - totals.realExpense;
    const savingsPct = hasRealIncome ? ZUtils.pct(realSalaryIncome - totals.realExpense, realSalaryIncome) : 0;
    const spentPct = hasRealIncome ? ZUtils.pct(totals.realExpense, realSalaryIncome) : 0;
    const budgetUsedPct = totals.budgetExpense > 0 ? ZUtils.pct(totals.realExpense, totals.budgetExpense) : 0;

    const catSorted = Object.entries(catReal).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const allCats = new Set([...Object.keys(catBudget), ...Object.keys(catReal)]);

    return `
      <div class="screen-content">

        ${_setupBanner(state, totals, hasRealIncome)}

        <!-- Linha 1: KPI cards -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon">💵</div>
            <div class="kpi-label">Receita do Mês</div>
            <div class="kpi-value">${hasRealIncome ? ZUtils.formatCurrencyShort(realSalaryIncome) : '—'}</div>
            <div class="kpi-sub">
              ${totals.budgetIncome > 0 ? `<span>Orçado: ${ZUtils.formatCurrencyShort(totals.budgetIncome)}</span>` : '<span>Nenhum orçamento</span>'}
            </div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon">💸</div>
            <div class="kpi-label">Despesa do Mês</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totals.realExpense)}</div>
            <div class="kpi-sub">
              ${totals.budgetExpense > 0 ? `<span>Orçado: ${ZUtils.formatCurrencyShort(totals.budgetExpense)}</span>` : '<span>Nenhum orçamento</span>'}
            </div>
          </div>
          <div class="kpi-card balance ${hasRealIncome && balance < 0 ? 'negative' : ''}">
            <div class="kpi-icon">${hasRealIncome ? (balance >= 0 ? '💰' : '⚠️') : '💰'}</div>
            <div class="kpi-label">Saldo do Mês</div>
            <div class="kpi-value">${hasRealIncome ? ZUtils.formatCurrencyShort(realSalaryIncome - totals.realExpense) : '—'}</div>
            <div class="kpi-sub">
              ${!hasRealIncome
                ? `<span style="color:var(--text-muted)">Sem receitas lançadas</span>`
                : `<span style="color:${savingsPct >= 10 ? 'var(--success)' : 'var(--warning)'}">
                    ${savingsPct >= 0 ? savingsPct + '% poupado' : 'Déficit'}
                  </span>`}
            </div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">📊</div>
            <div class="kpi-label">Orçamento Utilizado</div>
            <div class="kpi-value" style="color:${budgetUsedPct > 100 ? 'var(--danger)' : budgetUsedPct > 80 ? 'var(--warning)' : 'var(--text)'}">
              ${budgetUsedPct}%
            </div>
            <div class="kpi-sub">
              <span>${ZUtils.formatCurrencyShort(totals.realExpense)} / ${ZUtils.formatCurrencyShort(totals.budgetExpense)}</span>
            </div>
          </div>
        </div>

        <!-- Linha 2: Gráficos -->
        <div class="charts-row">

          <!-- Orçado x Realizado por categoria -->
          <div class="card">
            <div class="card-header">
              <h3>Orçado x Realizado por Categoria</h3>
              <button class="card-action" onclick="ZApp.navigate('comparison')">Ver análise completa →</button>
            </div>
            ${Array.from(allCats).length === 0 ? `
              <div class="empty-state" style="padding:30px">
                <p>Lance transações para ver a comparação</p>
              </div>
            ` : `
            <div class="hbar-chart">
              ${Array.from(allCats).map(cat => {
                const budgeted = catBudget[cat] || 0;
                const actual = catReal[cat] || 0;
                const maxVal = Math.max(budgeted, actual, 1);
                const budgetWidth = Math.round((budgeted / maxVal) * 100);
                const actualWidth = Math.round((actual / maxVal) * 100);
                const isOver = actual > budgeted && budgeted > 0;
                const cfg = ZUtils.getCatConfig(cat);
                return `
                <div class="hbar-row">
                  <div class="hbar-label">
                    <div class="hbar-cat">
                      <span style="background:${cfg.bg}; padding:2px 7px; border-radius:6px; font-size:12px">${cfg.emoji} ${cat}</span>
                      ${isOver ? '<span class="badge badge-red" style="font-size:10px">Acima</span>' : ''}
                    </div>
                    <div class="hbar-vals">
                      <span class="hbar-val-budget">Orç: ${ZUtils.formatCurrencyShort(budgeted)}</span>
                      <span class="hbar-val-actual" style="color:${isOver ? 'var(--danger)' : 'var(--text)'}">Real: ${ZUtils.formatCurrencyShort(actual)}</span>
                    </div>
                  </div>
                  <div class="hbar-tracks">
                    ${budgeted > 0 ? `<div class="hbar-track"><div class="hbar-fill budget" style="width:${budgetWidth}%"></div></div>` : ''}
                    <div class="hbar-track"><div class="hbar-fill ${isOver ? 'over' : actual > 0 ? 'actual' : ''}" style="width:${actualWidth}%; background:${isOver ? '' : cfg.color}"></div></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
            <div style="margin-top:12px; display:flex; gap:16px; font-size:11px; color:var(--text-muted)">
              <span style="display:flex; align-items:center; gap:5px"><span style="width:12px;height:6px;background:#CBD5E1;border-radius:3px;display:inline-block"></span>Orçado</span>
              <span style="display:flex; align-items:center; gap:5px"><span style="width:12px;height:6px;background:var(--primary);border-radius:3px;display:inline-block"></span>Realizado</span>
              <span style="display:flex; align-items:center; gap:5px"><span style="width:12px;height:6px;background:var(--danger);border-radius:3px;display:inline-block"></span>Acima do orçado</span>
            </div>`}
          </div>

          <!-- Distribuição de Gastos -->
          <div class="card">
            <div class="card-header">
              <h3>Distribuição de Gastos</h3>
              ${totals.realIncome > 0 ? `<span class="badge badge-gray">% sobre receita</span>` : ''}
            </div>

            ${catSorted.length === 0 ? `
              <div class="empty-state" style="padding:20px">
                <div class="empty-icon">🥧</div>
                <p>Sem gastos registrados neste mês</p>
              </div>
            ` : catSorted.map(([cat, val]) => {
              const cfg = ZUtils.getCatConfig(cat);
              const pct = totals.realIncome > 0 ? ZUtils.pct(val, totals.realIncome) : 0;
              const bench = data.benchmarks[cat];
              const isOver = bench && pct > bench.max;
              return `
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label" style="display:flex; align-items:center; gap:6px">
                    <span style="width:10px; height:10px; border-radius:50%; background:${cfg.color}; display:inline-block; flex-shrink:0"></span>
                    ${cfg.emoji} ${cat}
                    ${isOver ? '<span class="badge badge-red" style="font-size:10px; padding:1px 5px">Acima</span>' : ''}
                  </span>
                  <span class="prog-value">
                    ${ZUtils.formatCurrencyShort(val)}
                    <span style="color:var(--text-muted); font-weight:500"> · ${pct}%</span>
                  </span>
                </div>
                <div class="progress-bar" style="height:6px">
                  <div class="fill" style="width:${Math.min(pct, 100)}%; background:${isOver ? 'var(--danger)' : cfg.color}"></div>
                </div>
                ${bench ? `<div style="font-size:10px; color:var(--text-muted); margin-top:3px">Ideal: ${bench.min}–${bench.max}%</div>` : ''}
              </div>`;
            }).join('')}

            <!-- Patrimônio líquido mini -->
            <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border)">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:center">
                <div style="padding:10px; background:var(--success-light); border-radius:var(--radius-sm)">
                  <div style="font-size:15px; font-weight:800; color:var(--success)">${ZUtils.formatCurrencyShort(netWorth.totalAssets)}</div>
                  <div style="font-size:10px; color:var(--text-muted); margin-top:2px">Total de Ativos</div>
                </div>
                <div style="padding:10px; background:var(--danger-light); border-radius:var(--radius-sm)">
                  <div style="font-size:15px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrencyShort(netWorth.totalDebts)}</div>
                  <div style="font-size:10px; color:var(--text-muted); margin-top:2px">Total de Dívidas</div>
                </div>
              </div>
              <div style="margin-top:10px; padding:10px; background:${netWorth.netWorth >= 0 ? 'var(--primary-light)' : 'var(--danger-light)'}; border-radius:var(--radius-sm); text-align:center">
                <div style="font-size:18px; font-weight:800; color:${netWorth.netWorth >= 0 ? 'var(--primary)' : 'var(--danger)'}">
                  ${ZUtils.formatCurrencyShort(netWorth.netWorth)}
                </div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:2px">Patrimônio Líquido</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Linha 3: Transações + Diagnóstico + Alertas -->
        <div class="content-row">

          <!-- Últimas Transações -->
          <div class="card">
            <div class="card-header">
              <h3>Últimas Transações</h3>
              <button class="card-action" onclick="ZApp.navigate('transactions')">Ver todas →</button>
            </div>
            ${recentTx.length === 0 ? `
              <div class="empty-state" style="padding:24px">
                <div class="empty-icon">💳</div>
                <p>Nenhuma transação. Use <strong>+ Novo Lançamento</strong> acima.</p>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Conta</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${recentTx.map(tx => {
                  const cfg = ZUtils.getCatConfig(tx.category);
                  return `
                  <tr style="cursor:pointer" onclick="ZApp.openEditTx('${tx.id}')">
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <div class="tx-icon" style="background:${cfg.bg}; width:32px; height:32px; font-size:15px; border-radius:8px">${cfg.emoji}</div>
                        <span style="font-weight:600">${tx.description}</span>
                      </div>
                    </td>
                    <td><span class="badge badge-gray">${tx.category}</span></td>
                    <td style="color:var(--text-muted)">${tx.account || '—'}</td>
                    <td style="color:var(--text-muted)">${ZUtils.formatDate(tx.date)}</td>
                    <td style="font-weight:700; color:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                      ${tx.type === 'income' ? '+' : '-'}${ZUtils.formatCurrencyShort(tx.amount)}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>

          <!-- Diagnóstico + Progresso -->
          <div style="display:flex; flex-direction:column; gap:20px;">

            <!-- Indicadores -->
            <div class="card">
              <div class="card-header"><h3>Indicadores do Mês</h3></div>
              ${!hasRealIncome ? `
                <div style="padding:12px 0; text-align:center; color:var(--text-muted); font-size:13px">
                  <div style="font-size:24px; margin-bottom:8px">📊</div>
                  Indicadores disponíveis após<br>adicionar receitas do mês
                  <div style="margin-top:12px">
                    <button onclick="ZApp.openModal('addTransaction', {type:'income'})"
                      style="padding:7px 16px; background:var(--primary); color:white; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer">
                      + Adicionar Receita
                    </button>
                  </div>
                </div>
              ` : `
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label">💸 Gastos / Receita</span>
                  <span class="prog-value" style="color:${spentPct > 90 ? 'var(--danger)' : 'inherit'}">${spentPct}%</span>
                </div>
                <div class="progress-bar"><div class="fill ${spentPct > 90 ? 'red' : spentPct > 70 ? 'orange' : 'blue'}" style="width:${Math.min(spentPct,100)}%"></div></div>
              </div>
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label">💰 Taxa de Poupança</span>
                  <span class="prog-value" style="color:${savingsPct >= 10 ? 'var(--success)' : 'var(--warning)'}">${Math.max(0, savingsPct)}%</span>
                </div>
                <div class="progress-bar"><div class="fill green" style="width:${Math.max(0, Math.min(savingsPct, 100))}%"></div></div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:3px">Meta recomendada: ≥ 10%</div>
              </div>
              ${totals.budgetExpense > 0 ? `
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label">📊 Orçamento Usado</span>
                  <span class="prog-value" style="color:${budgetUsedPct > 100 ? 'var(--danger)' : 'inherit'}">${budgetUsedPct}%</span>
                </div>
                <div class="progress-bar"><div class="fill ${budgetUsedPct > 100 ? 'red' : 'blue'}" style="width:${Math.min(budgetUsedPct, 100)}%"></div></div>
              </div>` : ''}
              `}
            </div>

            <!-- Diagnóstico automático -->
            <div class="card" style="flex:1">
              <div class="card-header">
                <h3>Diagnóstico Financeiro</h3>
                <button class="card-action" onclick="ZApp.navigate('comparison')">Análise →</button>
              </div>
              ${diagnosis.map(m => `
                <div class="diagnosis-item">
                  <div class="diag-icon" style="background:${m.bg}">${m.icon}</div>
                  <div class="diag-text">${m.text}</div>
                </div>
              `).join('')}
              <div style="padding:12px 16px 16px; border-top:1px solid var(--border-light); margin-top:8px">
                <button onclick="ZDashboard.runAiAnalysis()"
                  style="width:100%; padding:10px; background:linear-gradient(135deg, #337418, #5DD62C); color:white; border:none; border-radius:var(--radius-sm); font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:opacity 0.15s"
                  onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  ✨ Diagnóstico com IA
                </button>
                ${!ZAI.hasKey() ? `<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:6px">Configure a chave Claude em <button onclick="ZApp.navigate('settings')" style="background:none; border:none; color:var(--primary); font-size:11px; font-weight:600; cursor:pointer; padding:0">Configurações</button></div>` : ''}
              </div>
            </div>
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
    const totals = ZData.getMonthTotals(data, month);
    const catReal = ZData.getCategoryTotals(data, month);
    const catBudget = ZData.getBudgetByCategory(data, month);
    const netWorth = ZData.getNetWorth(data);
    const recentTx = (data.months[month]?.transactions || []).slice(0, 5);
    const monthName = ZUtils.getMonthName(month);

    const realSalaryIncome = (data.months[month]?.transactions || [])
      .filter(t => t.type === 'income' && t.category !== 'Estorno/Devolução')
      .reduce((s, t) => s + t.amount, 0);
    const hasRealIncome = realSalaryIncome > 0;

    const balance = realSalaryIncome - totals.realExpense;
    const savingsPct = hasRealIncome ? ZUtils.pct(balance, realSalaryIncome) : 0;
    const spentPct = hasRealIncome ? ZUtils.pct(totals.realExpense, realSalaryIncome) : 0;
    const catSorted = Object.entries(catReal).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Painel</div>
          <h1>ZAFINN</h1>
        </div>
        <div class="month-selector">
          <span>${monthName}</span>
          <button class="month-btn" onclick="ZApp.changeMonth(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <button class="month-btn" onclick="ZApp.changeMonth(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
      <div class="screen-content">

        ${_setupBanner(state, totals, hasRealIncome)}

        <!-- Saldo hero -->
        <div class="balance-hero">
          <div class="hero-label">Saldo do Mês</div>
          <div class="hero-value">${hasRealIncome ? ZUtils.formatCurrency(balance) : '—'}</div>
          <div class="hero-row">
            <div class="hero-item"><div class="item-label">↑ Receitas</div><div class="item-value">${hasRealIncome ? ZUtils.formatCurrencyShort(realSalaryIncome) : '—'}</div></div>
            <div class="hero-item"><div class="item-label">↓ Despesas</div><div class="item-value">${ZUtils.formatCurrencyShort(totals.realExpense)}</div></div>
            <div class="hero-item"><div class="item-label">💰 Poupado</div><div class="item-value">${hasRealIncome ? savingsPct + '%' : '—'}</div></div>
          </div>
        </div>

        <!-- KPIs 2x2 -->
        <div class="kpi-grid">
          <div class="kpi-card" style="padding:14px">
            <div class="kpi-label" style="font-size:10px">Orçado Receita</div>
            <div class="kpi-value" style="font-size:18px; color:var(--success)">${ZUtils.formatCurrencyShort(totals.budgetIncome)}</div>
          </div>
          <div class="kpi-card" style="padding:14px">
            <div class="kpi-label" style="font-size:10px">Orçado Despesa</div>
            <div class="kpi-value" style="font-size:18px; color:var(--danger)">${ZUtils.formatCurrencyShort(totals.budgetExpense)}</div>
          </div>
          <div class="kpi-card" style="padding:14px">
            <div class="kpi-label" style="font-size:10px">Patrimônio Liq.</div>
            <div class="kpi-value" style="font-size:18px; color:${netWorth.netWorth >= 0 ? 'var(--primary)' : 'var(--danger)'}">${ZUtils.formatCurrencyShort(netWorth.netWorth)}</div>
          </div>
          <div class="kpi-card" style="padding:14px">
            <div class="kpi-label" style="font-size:10px">Orç. Utilizado</div>
            <div class="kpi-value" style="font-size:18px">${totals.budgetExpense > 0 ? ZUtils.pct(totals.realExpense, totals.budgetExpense) + '%' : '—'}</div>
          </div>
        </div>

        <!-- Progresso -->
        <div class="spacer-sm"></div>
        ${totals.realIncome > 0 ? `
        <div class="card">
          <div class="card-title">Progresso do Mês</div>
          <div class="progress-item">
            <div class="prog-header"><span class="prog-label">💸 Gastos sobre receita</span><span class="prog-value">${spentPct}%</span></div>
            <div class="progress-bar"><div class="fill ${spentPct > 90 ? 'red' : spentPct > 70 ? 'orange' : 'blue'}" style="width:${Math.min(spentPct,100)}%"></div></div>
          </div>
          <div class="progress-item">
            <div class="prog-header"><span class="prog-label">💰 Taxa de poupança</span><span class="prog-value">${Math.max(0,savingsPct)}%</span></div>
            <div class="progress-bar"><div class="fill green" style="width:${Math.max(0, Math.min(savingsPct, 100))}%"></div></div>
          </div>
        </div>` : ''}

        <!-- Maiores gastos -->
        ${catSorted.length > 0 ? `
        <div class="section-header"><h2>Maiores Gastos</h2><button class="see-all" onclick="ZApp.navigate('transactions')">Ver tudo</button></div>
        <div class="card" style="margin-top:0; padding: 8px 16px">
          ${catSorted.map(([cat, val]) => {
            const cfg = ZUtils.getCatConfig(cat);
            const pct = totals.realIncome > 0 ? ZUtils.pct(val, totals.realIncome) : 0;
            const budgeted = catBudget[cat] || 0;
            return `
            <div class="category-list-item">
              <div class="cat-icon" style="background:${cfg.bg}">${cfg.emoji}</div>
              <div style="flex:1; min-width:0">
                <div class="cat-name">${cat}</div>
                <div class="cat-sub">
                  <div class="progress-bar" style="width:80px; display:inline-block; vertical-align:middle">
                    <div class="fill" style="width:${Math.min(pct,100)}%; background:${cfg.color}"></div>
                  </div>
                  <span style="margin-left:6px; font-size:11px; color:var(--text-muted)">${pct}% da renda</span>
                </div>
              </div>
              <div style="text-align:right">
                <div class="cat-value">${ZUtils.formatCurrencyShort(val)}</div>
                ${budgeted > 0 ? `<div class="cat-pct" style="color:${val > budgeted ? 'var(--danger)' : 'var(--success)'}">${val > budgeted ? '▲' : '▼'} ${ZUtils.formatCurrencyShort(budgeted)}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <!-- Últimas transações -->
        ${recentTx.length > 0 ? `
        <div class="section-header"><h2>Últimas Transações</h2><button class="see-all" onclick="ZApp.navigate('transactions')">Ver tudo</button></div>
        <div style="background:var(--card); margin:0 16px; border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
          ${recentTx.map(tx => {
            const cfg = ZUtils.getCatConfig(tx.category);
            return `
            <div class="transaction-item" onclick="ZApp.openEditTx('${tx.id}')">
              <div class="tx-icon" style="background:${cfg.bg}">${cfg.emoji}</div>
              <div class="tx-info"><div class="tx-desc">${tx.description}</div><div class="tx-cat">${tx.category} · ${ZUtils.formatDateShort(tx.date)}</div></div>
              <div class="tx-right"><div class="tx-value ${tx.type}">${tx.type === 'income' ? '+' : '-'}${ZUtils.formatCurrencyShort(tx.amount)}</div></div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <!-- Diagnóstico rápido -->
        ${totals.realIncome > 0 ? (() => {
          const msgs = ZUtils.generateDiagnosis(data, month).slice(0, 2);
          return `
          <div class="section-header"><h2>Diagnóstico</h2><button class="see-all" onclick="ZApp.navigate('comparison')">Análise</button></div>
          <div class="card" style="margin-top:0; padding:8px 16px">
            ${msgs.map(m => `<div class="diagnosis-item"><div class="diag-icon" style="background:${m.bg}">${m.icon}</div><div class="diag-text">${m.text}</div></div>`).join('')}
          </div>`;
        })() : ''}

        <!-- Metas financeiras (resumo) -->
        ${(() => {
          const goals = (data.goals || []).filter(g => g.saved < g.target).slice(0, 2);
          if (goals.length === 0) return `
            <div class="section-header"><h2>Metas</h2><button class="see-all" onclick="ZApp.navigate('goals')">Ver</button></div>
            <div class="card" style="margin-top:0; padding:16px; text-align:center">
              <div style="font-size:24px; margin-bottom:6px">🎯</div>
              <div style="font-size:13px; color:var(--text-muted); margin-bottom:10px">Nenhuma meta criada ainda</div>
              <button onclick="ZApp.openModal('addGoal', {})" style="font-size:12px; font-weight:700; color:var(--primary); background:none; border:none; cursor:pointer">+ Criar meta</button>
            </div>
          `;
          return `
          <div class="section-header"><h2>Metas</h2><button class="see-all" onclick="ZApp.navigate('goals')">Ver todas</button></div>
          <div style="padding:0 16px; display:flex; flex-direction:column; gap:8px">
            ${goals.map(g => {
              const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              return `
              <div style="background:var(--card); border-radius:var(--radius); padding:12px 14px; box-shadow:var(--shadow-sm); display:flex; align-items:center; gap:12px"
                onclick="ZApp.navigate('goals')">
                <span style="font-size:22px">${g.emoji}</span>
                <div style="flex:1; min-width:0">
                  <div style="font-size:13px; font-weight:700; margin-bottom:5px">${g.name}</div>
                  <div style="background:var(--border); border-radius:3px; height:5px; overflow:hidden">
                    <div style="height:100%; width:${pct}%; background:${g.color}; border-radius:3px"></div>
                  </div>
                </div>
                <div style="font-size:12px; font-weight:700; color:${g.color}">${pct}%</div>
              </div>`;
            }).join('')}
          </div>`;
        })()}

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  async function runAiAnalysis() {
    if (!ZAI.hasKey()) {
      ZApp.navigate('settings');
      return;
    }

    // Mostrar modal de loading
    ZApp.openModal('aiAnalysis', { loading: true });

    try {
      const analysis = await ZAI.analyzeMonth(ZApp.state, ZApp.state.month);
      // Atualizar modal com o resultado
      ZApp.openModal('aiAnalysis', { analysis });
    } catch(e) {
      ZApp.openModal('aiAnalysis', { error: e.message });
    }
  }

  return { render, runAiAnalysis };

})();
