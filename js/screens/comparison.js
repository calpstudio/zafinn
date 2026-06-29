/* ================================================
   ZAFINN - Tela de Análise (Orçado x Realizado)
   Desktop: layout largo com tabela + cards lado a lado
   Mobile: abas empilhadas
   ================================================ */

const ZComparison = (function() {

  let activeTab = 'summary';
  const _expandedCats = new Set();

  function toggleCat(key) {
    if (_expandedCats.has(key)) _expandedCats.delete(key);
    else _expandedCats.add(key);
    ZApp.render();
  }

  function _renderTxDrilldown(txs, color, isIncome) {
    if (!txs || txs.length === 0) return `<div style="padding:8px 0; color:var(--text-muted); font-size:12px">Sem lançamentos registrados</div>`;
    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.map(tx => `
      <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--border-light)">
        <span style="font-size:11px; color:var(--text-muted); white-space:nowrap; flex-shrink:0">${ZUtils.formatDateShort(tx.date)}</span>
        <span style="font-size:13px; font-weight:500; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${tx.description}</span>
        ${tx.account ? `<span style="font-size:11px; color:var(--text-muted); flex-shrink:0">${tx.account}</span>` : ''}
        <span style="font-size:13px; font-weight:700; color:${isIncome ? 'var(--success)' : 'var(--danger)'}; flex-shrink:0">${ZUtils.formatCurrencyShort(tx.amount)}</span>
      </div>
    `).join('');
  }

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data, month } = state;
    const totals = ZData.getMonthTotals(data, month);
    const catReal = ZData.getCategoryTotals(data, month);
    const catBudget = ZData.getBudgetByCategory(data, month);
    const diagnosis = ZUtils.generateDiagnosis(data, month);
    const allCats = new Set([...Object.keys(catBudget), ...Object.keys(catReal)]);

    // Receitas por categoria (orçado e realizado)
    const incomeReal = {};
    (data.months[month]?.transactions || [])
      .filter(t => t.type === 'income')
      .forEach(t => { incomeReal[t.category] = (incomeReal[t.category] || 0) + t.amount; });
    const incomeBudget = {};
    (data.months[month]?.budget?.incomes || [])
      .forEach(i => { incomeBudget[i.category || i.name] = (incomeBudget[i.category || i.name] || 0) + i.amount; });
    const allIncomeCats = new Set([...Object.keys(incomeBudget), ...Object.keys(incomeReal)]);
    const incomeRows = Array.from(allIncomeCats).map(cat => {
      const budgeted = incomeBudget[cat] || 0;
      const actual = incomeReal[cat] || 0;
      const diff = actual - budgeted; // positivo = recebeu mais = bom
      const devPct = budgeted > 0 ? Math.round((diff / budgeted) * 100) : null;
      return { cat, budgeted, actual, diff, devPct };
    }).sort((a, b) => b.actual - a.actual);

    const balanceReal = totals.realIncome - totals.realExpense;
    const balanceBudget = totals.budgetIncome - totals.budgetExpense;
    const savingsPct = totals.realIncome > 0 ? ZUtils.pct(balanceReal, totals.realIncome) : 0;
    const spentPct = totals.realIncome > 0 ? ZUtils.pct(totals.realExpense, totals.realIncome) : 0;

    // Indexa transações por categoria e tipo para drill-down
    const txByCat = {};
    (data.months[month]?.transactions || []).forEach(tx => {
      const key = `${tx.type}-${tx.category}`;
      if (!txByCat[key]) txByCat[key] = [];
      txByCat[key].push(tx);
    });

    const catRows = Array.from(allCats).map(cat => {
      const budgeted = catBudget[cat] || 0;
      const actual = catReal[cat] || 0;
      const diff = actual - budgeted;
      const devPct = budgeted > 0 ? Math.round((diff / budgeted) * 100) : null;
      const pctIncome = totals.realIncome > 0 ? ZUtils.pct(actual, totals.realIncome) : 0;
      return { cat, budgeted, actual, diff, devPct, pctIncome };
    }).sort((a, b) => b.actual - a.actual);

    return `
      <div class="screen-content">

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-icon">💵</div>
            <div class="kpi-label">Receita Real</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totals.realIncome)}</div>
            <div class="kpi-sub">
              ${totals.budgetIncome > 0 ? `
                <span style="color:${totals.realIncome >= totals.budgetIncome ? 'var(--success)' : 'var(--warning)'}">
                  ${totals.realIncome >= totals.budgetIncome ? '▲' : '▼'} vs R$ ${ZUtils.formatCurrencyShort(totals.budgetIncome)} orçado
                </span>` : 'Sem meta'}
            </div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-icon">💸</div>
            <div class="kpi-label">Despesa Real</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(totals.realExpense)}</div>
            <div class="kpi-sub">
              ${totals.budgetExpense > 0 ? `
                <span style="color:${totals.realExpense <= totals.budgetExpense ? 'var(--success)' : 'var(--danger)'}">
                  ${totals.realExpense <= totals.budgetExpense ? '▼ Dentro do orçado' : '▲ Acima do orçado'}
                </span>` : 'Sem meta'}
            </div>
          </div>
          <div class="kpi-card balance ${balanceReal < 0 ? 'negative' : ''}">
            <div class="kpi-icon">💰</div>
            <div class="kpi-label">Taxa de Poupança</div>
            <div class="kpi-value" style="color:${savingsPct >= 10 ? 'var(--success)' : savingsPct > 0 ? 'var(--warning)' : 'var(--danger)'}">
              ${savingsPct}%
            </div>
            <div class="kpi-sub">Meta recomendada: ≥ 10%</div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">📊</div>
            <div class="kpi-label">Renda Comprometida</div>
            <div class="kpi-value" style="color:${spentPct > 90 ? 'var(--danger)' : spentPct > 70 ? 'var(--warning)' : 'var(--text)'}">
              ${spentPct}%
            </div>
            <div class="kpi-sub">Ideal: até 80-90%</div>
          </div>
        </div>

        <!-- Tabela de categorias + Diagnóstico -->
        <div class="content-row">

          <!-- Tabela de categorias -->
          <div class="card">
            <div class="card-header">
              <h3>Orçado x Realizado por Categoria</h3>
              <div style="display:flex; gap:12px; font-size:11px; color:var(--text-muted); align-items:center">
                <span style="display:flex; align-items:center; gap:4px"><span style="width:10px;height:10px;background:var(--border);border-radius:2px;display:inline-block"></span>Orçado</span>
                <span style="display:flex; align-items:center; gap:4px"><span style="width:10px;height:10px;background:var(--primary);border-radius:2px;display:inline-block"></span>Realizado</span>
                <span style="display:flex; align-items:center; gap:4px"><span style="width:10px;height:10px;background:var(--danger);border-radius:2px;display:inline-block"></span>Acima</span>
              </div>
            </div>

            ${catRows.length === 0 && incomeRows.length === 0 ? `
              <div class="empty-state" style="padding:30px">
                <div class="empty-icon">📊</div>
                <p>Lance transações para ver a análise por categoria</p>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Orçado</th>
                  <th>Realizado</th>
                  <th>Diferença</th>
                  <th>% Renda</th>
                  <th>Desvio</th>
                </tr>
              </thead>
              <tbody>
                ${incomeRows.length > 0 ? `
                <tr><td colspan="6" style="padding:6px 12px; background:var(--success-light); font-size:11px; font-weight:700; color:var(--success); text-transform:uppercase; letter-spacing:0.5px">💵 Receitas</td></tr>
                ${incomeRows.map(({ cat, budgeted, actual, diff, devPct }) => {
                  const cfg = ZUtils.getCatConfig(cat);
                  const isGood = diff >= 0 && budgeted > 0;
                  const isBad = diff < 0 && budgeted > 0;
                  const key = `income-${cat}`;
                  const isExpanded = _expandedCats.has(key);
                  const catTxs = txByCat[key] || [];
                  return `
                  <tr onclick="ZComparison.toggleCat('${key}')" style="cursor:pointer; background:${isExpanded ? 'rgba(16,185,129,0.04)' : 'transparent'}">
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <div style="background:${cfg.bg}; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">${cfg.emoji}</div>
                        <span style="font-weight:600">${cat}</span>
                        ${catTxs.length > 0 ? `<span style="font-size:10px; color:var(--text-muted)">${catTxs.length} lançamento${catTxs.length > 1 ? 's' : ''}</span>` : ''}
                      </div>
                    </td>
                    <td style="color:var(--text-secondary)">${budgeted > 0 ? ZUtils.formatCurrencyShort(budgeted) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td style="font-weight:700; color:var(--success)">${ZUtils.formatCurrencyShort(actual)}</td>
                    <td style="font-weight:600; color:${isGood ? 'var(--success)' : isBad ? 'var(--warning)' : 'var(--text-muted)'}">
                      ${budgeted > 0 ? (diff > 0 ? '+' : '') + ZUtils.formatCurrencyShort(diff) : '<span style="color:var(--text-muted)">—</span>'}
                    </td>
                    <td>—</td>
                    <td style="display:flex; align-items:center; gap:6px">
                      ${devPct !== null ? `
                        <span style="padding:3px 8px; border-radius:20px; font-size:11px; font-weight:700;
                          background:${isGood ? 'var(--success-light)' : isBad ? 'var(--danger-light)' : 'var(--border-light)'};
                          color:${isGood ? 'var(--success)' : isBad ? 'var(--danger)' : 'var(--text-muted)'}">
                          ${diff > 0 ? '+' : ''}${devPct}%
                        </span>` : '<span style="color:var(--text-muted)">—</span>'}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" style="color:var(--text-muted); transform:${isExpanded ? 'rotate(180deg)' : 'none'}; transition:transform 0.2s; flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
                    </td>
                  </tr>
                  ${isExpanded ? `
                  <tr style="background:var(--bg)">
                    <td colspan="6" style="padding:8px 16px 12px 48px; border-left:3px solid var(--success)">
                      ${_renderTxDrilldown(catTxs, cfg.color, true)}
                    </td>
                  </tr>` : ''}`;
                }).join('')}
                <tr><td colspan="6" style="padding:6px 12px; background:var(--danger-light); font-size:11px; font-weight:700; color:var(--danger); text-transform:uppercase; letter-spacing:0.5px">💸 Despesas</td></tr>
                ` : ''}
                ${catRows.map(({ cat, budgeted, actual, diff, devPct, pctIncome }) => {
                  const cfg = ZUtils.getCatConfig(cat);
                  const isOver = diff > 0 && budgeted > 0;
                  const isUnder = diff < 0 && budgeted > 0;
                  const key = `expense-${cat}`;
                  const isExpanded = _expandedCats.has(key);
                  const catTxs = txByCat[key] || [];
                  return `
                  <tr onclick="ZComparison.toggleCat('${key}')" style="cursor:pointer; background:${isExpanded ? 'rgba(239,68,68,0.03)' : 'transparent'}">
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <div style="background:${cfg.bg}; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">${cfg.emoji}</div>
                        <span style="font-weight:600">${cat}</span>
                        ${catTxs.length > 0 ? `<span style="font-size:10px; color:var(--text-muted)">${catTxs.length} lançamento${catTxs.length > 1 ? 's' : ''}</span>` : ''}
                      </div>
                    </td>
                    <td style="color:var(--text-secondary)">${budgeted > 0 ? ZUtils.formatCurrencyShort(budgeted) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td style="font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(actual)}</td>
                    <td style="font-weight:600; color:${isOver ? 'var(--danger)' : isUnder ? 'var(--success)' : 'var(--text-muted)'}">
                      ${budgeted > 0 ? (diff > 0 ? '+' : '') + ZUtils.formatCurrencyShort(diff) : '<span style="color:var(--text-muted)">—</span>'}
                    </td>
                    <td style="color:var(--text-secondary)">${pctIncome}%</td>
                    <td style="display:flex; align-items:center; gap:6px">
                      ${devPct !== null ? `
                        <span style="padding:3px 8px; border-radius:20px; font-size:11px; font-weight:700;
                          background:${isOver ? 'var(--danger-light)' : isUnder ? 'var(--success-light)' : 'var(--border-light)'};
                          color:${isOver ? 'var(--danger)' : isUnder ? 'var(--success)' : 'var(--text-muted)'}">
                          ${isOver ? '+' : ''}${devPct}%
                        </span>` : '<span style="color:var(--text-muted)">—</span>'}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" style="color:var(--text-muted); transform:${isExpanded ? 'rotate(180deg)' : 'none'}; transition:transform 0.2s; flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
                    </td>
                  </tr>
                  ${isExpanded ? `
                  <tr style="background:var(--bg)">
                    <td colspan="6" style="padding:8px 16px 12px 48px; border-left:3px solid ${cfg.color}">
                      ${_renderTxDrilldown(catTxs, cfg.color, false)}
                    </td>
                  </tr>` : ''}`;
                }).join('')}
              </tbody>
            </table>

            <!-- Rodapé totais -->
            <div style="margin-top:4px; padding:12px 12px; border-top:2px solid var(--border); display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr; gap:8px; font-size:12px">
              <div style="font-weight:700; color:var(--text)">TOTAL</div>
              <div style="font-weight:700; color:var(--text-secondary)">${ZUtils.formatCurrencyShort(totals.budgetExpense)}</div>
              <div style="font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(totals.realExpense)}</div>
              <div style="font-weight:700; color:${totals.realExpense > totals.budgetExpense ? 'var(--danger)' : 'var(--success)'}">${totals.budgetExpense > 0 ? (totals.realExpense > totals.budgetExpense ? '+' : '') + ZUtils.formatCurrencyShort(totals.realExpense - totals.budgetExpense) : '—'}</div>
              <div style="font-weight:700">${spentPct}%</div>
              <div></div>
            </div>`}
          </div>

          <!-- Histórico por categoria -->
          ${renderHistoryDesktop(data.categoryHistory)}

          <!-- Diagnóstico + Indicadores -->
          <div style="display:flex; flex-direction:column; gap:20px">

            <!-- Comparação receita/despesa -->
            <div class="card">
              <div class="card-header"><h3>Comparação Geral</h3></div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px">
                <div style="padding:14px; background:var(--success-light); border-radius:var(--radius-sm); text-align:center">
                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px">Receita Real</div>
                  <div style="font-size:20px; font-weight:800; color:var(--success)">${ZUtils.formatCurrencyShort(totals.realIncome)}</div>
                </div>
                <div style="padding:14px; background:var(--danger-light); border-radius:var(--radius-sm); text-align:center">
                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px">Despesa Real</div>
                  <div style="font-size:20px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrencyShort(totals.realExpense)}</div>
                </div>
              </div>

              ${totals.budgetExpense > 0 ? `
              <div class="progress-item">
                <div class="prog-header">
                  <span class="prog-label">Orçamento utilizado</span>
                  <span class="prog-value">${ZUtils.pct(totals.realExpense, totals.budgetExpense)}%</span>
                </div>
                <div class="progress-bar">
                  <div class="fill ${totals.realExpense > totals.budgetExpense ? 'red' : 'blue'}" style="width:${Math.min(ZUtils.pct(totals.realExpense, totals.budgetExpense), 100)}%"></div>
                </div>
              </div>` : ''}

              <div class="progress-item" style="margin-top:12px">
                <div class="prog-header">
                  <span class="prog-label">Taxa de poupança</span>
                  <span class="prog-value" style="color:${savingsPct >= 10 ? 'var(--success)' : 'var(--warning)'}">${savingsPct}%</span>
                </div>
                <div class="progress-bar">
                  <div class="fill green" style="width:${Math.max(0, Math.min(savingsPct, 100))}%"></div>
                </div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:3px">Meta recomendada: ≥ 10%</div>
              </div>
            </div>

            <!-- Diagnóstico automático -->
            <div class="card" style="flex:1">
              <div class="card-header"><h3>Diagnóstico Automático</h3></div>
              ${diagnosis.length === 0 ? `
                <div class="empty-state" style="padding:20px">
                  <div class="empty-icon">🤔</div>
                  <p>Lance transações para receber o diagnóstico</p>
                </div>
              ` : diagnosis.map(m => `
                <div class="diagnosis-item">
                  <div class="diag-icon" style="background:${m.bg}">${m.icon}</div>
                  <div class="diag-text">${m.text}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  /* ================================================
     HISTÓRICO POR CATEGORIA (desktop)
     ================================================ */
  function renderHistoryDesktop(history) {
    if (!history) return '';
    if (history === 'loading') return `
      <div class="card" style="margin-top:0">
        <div class="card-header"><h3>📅 Histórico por Categoria (6 meses)</h3></div>
        <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px">Carregando histórico...</div>
      </div>`;

    const entries = Object.entries(history).sort((a, b) => b[1].avg - a[1].avg);
    if (entries.length === 0) return `
      <div class="card" style="margin-top:0">
        <div class="card-header"><h3>📅 Histórico por Categoria (6 meses)</h3></div>
        <div class="empty-state" style="padding:24px"><p>Sem dados históricos suficientes ainda</p></div>
      </div>`;

    return `
      <div class="card" style="margin-top:0">
        <div class="card-header">
          <h3>📅 Histórico por Categoria</h3>
          <span style="font-size:11px; color:var(--text-muted)">últimos 6 meses · gastos reais</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Mínimo</th>
              <th>Média/mês</th>
              <th>Máximo</th>
              <th style="text-align:center">Tendência</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([cat, h]) => {
              const cfg = ZUtils.getCatConfig(cat);
              const trend = _calcTrend(h.monthly);
              return `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:8px">
                    <div style="background:${cfg.bg}; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">${cfg.emoji}</div>
                    <span style="font-weight:600">${cat}</span>
                  </div>
                </td>
                <td style="color:var(--success); font-weight:600">${ZUtils.formatCurrencyShort(h.min)}</td>
                <td style="font-weight:700">${ZUtils.formatCurrencyShort(h.avg)}</td>
                <td style="color:var(--danger); font-weight:600">${ZUtils.formatCurrencyShort(h.max)}</td>
                <td style="text-align:center">
                  <div style="display:flex; align-items:flex-end; justify-content:center; gap:2px; height:28px">
                    ${renderSparkline(h.monthly, h.avg, cfg.color)}
                  </div>
                  <div style="font-size:10px; margin-top:3px; color:${trend > 0 ? 'var(--danger)' : trend < 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight:600">
                    ${trend > 0 ? '▲ subindo' : trend < 0 ? '▼ caindo' : '→ estável'}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderSparkline(monthly, avg, color) {
    const maxVal = Math.max(...monthly.map(m => m.value), 1);
    return monthly.map(m => {
      const h = m.value > 0 ? Math.max(4, Math.round((m.value / maxVal) * 28)) : 3;
      const c = m.value === 0 ? 'var(--border)'
              : m.value > avg * 1.15 ? 'var(--danger)'
              : m.value < avg * 0.85 ? 'var(--success)'
              : color;
      return `<div style="width:7px; height:${h}px; background:${c}; border-radius:2px 2px 0 0; flex-shrink:0"></div>`;
    }).join('');
  }

  function _calcTrend(monthly) {
    const vals = monthly.filter(m => m.value > 0);
    if (vals.length < 3) return 0;
    const last  = vals.slice(-2).reduce((s, m) => s + m.value, 0) / 2;
    const first = vals.slice(0, 2).reduce((s, m) => s + m.value, 0) / 2;
    const diff  = last - first;
    if (Math.abs(diff) < first * 0.05) return 0;
    return diff > 0 ? 1 : -1;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    const { data, month } = state;
    const totals = ZData.getMonthTotals(data, month);
    const catReal = ZData.getCategoryTotals(data, month);
    const catBudget = ZData.getBudgetByCategory(data, month);
    const diagnosis = ZUtils.generateDiagnosis(data, month);
    const monthName = ZUtils.getMonthName(month);
    const allCats = new Set([...Object.keys(catBudget), ...Object.keys(catReal)]);

    // Indexa transações por categoria para drill-down no mobile
    const txByCat = {};
    (data.months[month]?.transactions || []).forEach(tx => {
      const key = `${tx.type}-${tx.category}`;
      if (!txByCat[key]) txByCat[key] = [];
      txByCat[key].push(tx);
    });

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">${monthName}</div>
          <h1>Análise</h1>
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
        <div style="padding:10px 16px 0">
          <div class="segmented">
            <button class="seg-btn ${activeTab === 'summary' ? 'active' : ''}" onclick="ZComparison.setTab('summary')">Resumo</button>
            <button class="seg-btn ${activeTab === 'categories' ? 'active' : ''}" onclick="ZComparison.setTab('categories')">Categorias</button>
            <button class="seg-btn ${activeTab === 'history' ? 'active' : ''}" onclick="ZComparison.setTab('history')">Histórico</button>
            <button class="seg-btn ${activeTab === 'diagnosis' ? 'active' : ''}" onclick="ZComparison.setTab('diagnosis')">Diagnóstico</button>
          </div>
        </div>

        ${activeTab === 'summary' ? renderSummaryMobile(totals) : ''}
        ${activeTab === 'categories' ? renderCategoriesMobile(allCats, catBudget, catReal, totals.realIncome, txByCat) : ''}
        ${activeTab === 'history' ? renderHistoryMobile(data.categoryHistory) : ''}
        ${activeTab === 'diagnosis' ? renderDiagnosisMobile(diagnosis) : ''}

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  function renderSummaryMobile(totals) {
    const balanceReal = totals.realIncome - totals.realExpense;
    const incomeDeviation = totals.realIncome - totals.budgetIncome;
    const expenseDeviation = totals.realExpense - totals.budgetExpense;
    const savingsPct = totals.realIncome > 0 ? ZUtils.pct(balanceReal, totals.realIncome) : 0;
    const spentPct = totals.realIncome > 0 ? ZUtils.pct(totals.realExpense, totals.realIncome) : 0;

    return `
      <div class="spacer-sm"></div>
      <div style="padding:0 16px; display:flex; flex-direction:column; gap:10px">
        <div style="background:var(--card); border-radius:var(--radius); padding:16px; box-shadow:var(--shadow-sm)">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
            <span style="font-size:18px">💵</span>
            <span style="font-size:14px; font-weight:700">Receitas</span>
            ${incomeDeviation >= 0 ? `<span class="badge badge-green">+${ZUtils.formatCurrencyShort(incomeDeviation)}</span>` : `<span class="badge badge-red">${ZUtils.formatCurrencyShort(incomeDeviation)}</span>`}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Orçado</div><div style="font-size:20px; font-weight:800; color:var(--text-secondary)">${ZUtils.formatCurrencyShort(totals.budgetIncome)}</div></div>
            <div><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Realizado</div><div style="font-size:20px; font-weight:800; color:var(--success)">${ZUtils.formatCurrencyShort(totals.realIncome)}</div></div>
          </div>
        </div>
        <div style="background:var(--card); border-radius:var(--radius); padding:16px; box-shadow:var(--shadow-sm)">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
            <span style="font-size:18px">💸</span>
            <span style="font-size:14px; font-weight:700">Despesas</span>
            ${expenseDeviation > 0 ? `<span class="badge badge-red">+${ZUtils.formatCurrencyShort(expenseDeviation)}</span>` : `<span class="badge badge-green">${ZUtils.formatCurrencyShort(expenseDeviation)}</span>`}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Orçado</div><div style="font-size:20px; font-weight:800; color:var(--text-secondary)">${ZUtils.formatCurrencyShort(totals.budgetExpense)}</div></div>
            <div><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase">Realizado</div><div style="font-size:20px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrencyShort(totals.realExpense)}</div></div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div style="background:${savingsPct >= 10 ? 'var(--success-light)' : 'var(--warning-light)'}; border-radius:var(--radius); padding:14px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:${savingsPct >= 10 ? 'var(--success)' : 'var(--warning)'}">${savingsPct}%</div>
            <div style="font-size:11px; font-weight:600; color:var(--text-secondary)">Taxa de poupança</div>
            <div style="font-size:10px; color:var(--text-muted)">Ideal: ≥ 10%</div>
          </div>
          <div style="background:${spentPct <= 80 ? 'var(--primary-light)' : 'var(--danger-light)'}; border-radius:var(--radius); padding:14px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:${spentPct <= 80 ? 'var(--primary)' : 'var(--danger)'}">${spentPct}%</div>
            <div style="font-size:11px; font-weight:600; color:var(--text-secondary)">Da renda gasto</div>
            <div style="font-size:10px; color:var(--text-muted)">Ideal: ≤ 80%</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCategoriesMobile(allCats, catBudget, catReal, totalIncome, txByCat) {
    const rows = Array.from(allCats).map(cat => {
      const budgeted = catBudget[cat] || 0;
      const actual = catReal[cat] || 0;
      const diff = actual - budgeted;
      const devPct = budgeted > 0 ? Math.round((diff / budgeted) * 100) : null;
      const pctIncome = totalIncome > 0 ? ZUtils.pct(actual, totalIncome) : 0;
      return { cat, budgeted, actual, diff, devPct, pctIncome };
    }).sort((a, b) => b.actual - a.actual);

    return `
      <div class="spacer-sm"></div>
      <div style="margin:0 16px; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
        ${rows.length === 0 ? `<div class="empty-state"><div class="empty-icon">📊</div><p>Lance transações para ver a análise</p></div>`
        : rows.map(({ cat, budgeted, actual, diff, devPct, pctIncome }) => {
          const cfg = ZUtils.getCatConfig(cat);
          const isOver = diff > 0 && budgeted > 0;
          const isUnder = diff < 0 && budgeted > 0;
          const key = `expense-${cat}`;
          const isExpanded = _expandedCats.has(key);
          const catTxs = (txByCat || {})[key] || [];
          return `
          <div>
            <div onclick="ZComparison.toggleCat('${key}')" style="padding:12px 16px; border-bottom:1px solid var(--border-light); cursor:pointer; background:${isExpanded ? 'rgba(239,68,68,0.03)' : 'transparent'}">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                <div style="background:${cfg.bg}; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0">${cfg.emoji}</div>
                <div style="flex:1">
                  <div style="font-size:13px; font-weight:700">${cat}</div>
                  <div style="font-size:11px; color:var(--text-muted)">${pctIncome}% da renda · ${catTxs.length} lançamento${catTxs.length !== 1 ? 's' : ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px">
                  ${devPct !== null ? `<span class="deviation ${isOver ? 'over' : isUnder ? 'under' : 'ok'}">${isOver ? '+' : ''}${devPct}%</span>` : ''}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" style="color:var(--text-muted); transform:${isExpanded ? 'rotate(180deg)' : 'none'}; transition:transform 0.2s"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; font-size:12px">
                <div style="text-align:center"><div style="color:var(--text-muted); font-size:10px; text-transform:uppercase">Orçado</div><div style="font-weight:600; color:var(--text-secondary)">${budgeted > 0 ? ZUtils.formatCurrencyShort(budgeted) : '—'}</div></div>
                <div style="text-align:center"><div style="color:var(--text-muted); font-size:10px; text-transform:uppercase">Real</div><div style="font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(actual)}</div></div>
                <div style="text-align:center"><div style="color:var(--text-muted); font-size:10px; text-transform:uppercase">Dif.</div><div style="font-weight:700; color:${isOver ? 'var(--danger)' : isUnder ? 'var(--success)' : 'var(--text-muted)'}">
                  ${diff > 0 ? '+' : ''}${budgeted > 0 ? ZUtils.formatCurrencyShort(diff) : '—'}
                </div></div>
              </div>
              ${budgeted > 0 ? `<div style="margin-top:8px"><div class="progress-bar" style="height:5px"><div class="fill ${isOver ? 'red' : 'blue'}" style="width:${Math.min(ZUtils.pct(actual, budgeted), 100)}%; background:${cfg.color}"></div></div></div>` : ''}
            </div>
            ${isExpanded ? `
            <div style="padding:8px 16px 12px; background:var(--bg); border-bottom:1px solid var(--border-light); border-left:3px solid ${cfg.color}">
              ${_renderTxDrilldown(catTxs, cfg.color, false)}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderDiagnosisMobile(messages) {
    return `
      <div class="spacer-sm"></div>
      <div class="card">
        <div class="card-title">Diagnóstico Automático</div>
        ${messages.length === 0 ? `<div class="empty-state" style="padding:20px 0"><div class="empty-icon">🤔</div><p>Lance transações para receber o diagnóstico</p></div>`
        : messages.map(m => `
          <div class="diagnosis-item">
            <div class="diagnosis-icon" style="background:${m.bg}">${m.icon}</div>
            <div class="diagnosis-text">${m.text}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderHistoryMobile(history) {
    if (!history || history === 'loading') return `
      <div class="spacer-sm"></div>
      <div style="padding:40px 16px; text-align:center; color:var(--text-muted); font-size:13px">
        ${!history ? 'Sem dados históricos ainda' : 'Carregando...'}
      </div>`;

    const entries = Object.entries(history).sort((a, b) => b[1].avg - a[1].avg);
    if (entries.length === 0) return `
      <div class="spacer-sm"></div>
      <div style="padding:40px 16px; text-align:center; color:var(--text-muted); font-size:13px">Sem dados históricos suficientes ainda</div>`;

    return `
      <div class="spacer-sm"></div>
      <div style="margin:0 16px; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
        ${entries.map(([cat, h]) => {
          const cfg = ZUtils.getCatConfig(cat);
          const trend = _calcTrend(h.monthly);
          return `
          <div style="padding:14px 16px; border-bottom:1px solid var(--border-light)">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
              <div style="background:${cfg.bg}; width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0">${cfg.emoji}</div>
              <div style="flex:1">
                <div style="font-size:13px; font-weight:700">${cat}</div>
                <div style="font-size:11px; color:${trend > 0 ? 'var(--danger)' : trend < 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight:600; margin-top:1px">
                  ${trend > 0 ? '▲ tendência de aumento' : trend < 0 ? '▼ tendência de queda' : '→ estável'}
                </div>
              </div>
              <div style="display:flex; align-items:flex-end; gap:2px; height:24px">
                ${renderSparkline(h.monthly, h.avg, cfg.color)}
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; text-align:center">
              <div style="background:var(--success-light); border-radius:6px; padding:8px 4px">
                <div style="font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase">Mínimo</div>
                <div style="font-size:13px; font-weight:800; color:var(--success)">${ZUtils.formatCurrencyShort(h.min)}</div>
              </div>
              <div style="background:var(--primary-light); border-radius:6px; padding:8px 4px">
                <div style="font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase">Média</div>
                <div style="font-size:13px; font-weight:800; color:var(--primary)">${ZUtils.formatCurrencyShort(h.avg)}</div>
              </div>
              <div style="background:var(--danger-light); border-radius:6px; padding:8px 4px">
                <div style="font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase">Máximo</div>
                <div style="font-size:13px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrencyShort(h.max)}</div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function setTab(tab) {
    activeTab = tab;
    // Aciona carregamento do histórico ao entrar na aba
    if (tab === 'history' && !ZApp.state.data.categoryHistory) {
      ZApp.state.data.categoryHistory = 'loading';
      ZDB.loadCategoryHistory(6).then(h => {
        ZApp.state.data.categoryHistory = h;
        if (ZApp.state.screen === 'comparison') ZApp.render();
      }).catch(() => { ZApp.state.data.categoryHistory = null; });
    }
    ZApp.render();
  }

  return { render, setTab, toggleCat };

})();
