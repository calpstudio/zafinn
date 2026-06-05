/* ================================================
   ZAFINN - Tela de Patrimônio e Dívidas
   Desktop: bens e dívidas lado a lado
   Mobile: abas empilhadas
   ================================================ */

const ZPatrimony = (function() {

  let activeTab = 'overview';

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const { data } = state;
    const { totalAssets, totalDebts, netWorth } = ZData.getNetWorth(data);
    const assets = data.assets || [];
    const debts = data.debts || [];

    const assetCatConfig = {
      'Imóvel':      { emoji: '🏠', bg: '#EFF6FF', color: '#3B82F6' },
      'Veículo':     { emoji: '🚗', bg: '#F5F3FF', color: '#8B5CF6' },
      'Investimento':{ emoji: '💰', bg: '#ECFDF5', color: '#10B981' },
      'Empresa':     { emoji: '🏢', bg: '#FFFBEB', color: '#F59E0B' },
      'Terreno':     { emoji: '🌱', bg: '#F7FEE7', color: '#65A30D' },
      'Outros':      { emoji: '📦', bg: '#F5F5F4', color: '#78716C' }
    };

    const assetsByCat = {};
    assets.forEach(a => { assetsByCat[a.category] = (assetsByCat[a.category] || 0) + a.currentValue; });

    return `
      <div class="screen-content">

        <!-- KPIs de patrimônio -->
        <div class="kpi-grid">
          <div class="kpi-card income" style="border-top-color:var(--success)">
            <div class="kpi-icon">🏦</div>
            <div class="kpi-label">Total de Ativos</div>
            <div class="kpi-value" style="color:var(--success)">${ZUtils.formatCurrencyShort(totalAssets)}</div>
            <div class="kpi-sub">${assets.length} bens cadastrados</div>
          </div>
          <div class="kpi-card expense" style="border-top-color:var(--danger)">
            <div class="kpi-icon">📋</div>
            <div class="kpi-label">Total de Dívidas</div>
            <div class="kpi-value" style="color:var(--danger)">${ZUtils.formatCurrencyShort(totalDebts)}</div>
            <div class="kpi-sub">${debts.length} dívidas cadastradas</div>
          </div>
          <div class="kpi-card balance ${netWorth < 0 ? 'negative' : ''}">
            <div class="kpi-icon">${netWorth >= 0 ? '💎' : '⚠️'}</div>
            <div class="kpi-label">Patrimônio Líquido</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(netWorth)}</div>
            <div class="kpi-sub" style="color:${netWorth >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${netWorth >= 0 ? 'Ativos superam dívidas' : 'Dívidas superam ativos'}
            </div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">📐</div>
            <div class="kpi-label">Índice Ativos/Dívidas</div>
            <div class="kpi-value" style="color:${totalDebts > 0 && totalAssets / totalDebts < 1.5 ? 'var(--warning)' : 'var(--text)'}">
              ${totalDebts > 0 ? (totalAssets / totalDebts).toFixed(1) + 'x' : '∞'}
            </div>
            <div class="kpi-sub">Recomendado: ≥ 2×</div>
          </div>
        </div>

        <!-- Bens e Dívidas lado a lado -->
        <div class="equal-row">

          <!-- Bens / Ativos -->
          <div class="card">
            <div class="card-header">
              <h3>🏦 Bens e Ativos</h3>
              <button class="header-action-btn" style="padding:7px 12px; font-size:12px" onclick="ZApp.openModal('addAsset', {})">
                + Cadastrar Bem
              </button>
            </div>

            ${assets.length === 0 ? `
              <div class="empty-state" style="padding:30px">
                <div class="empty-icon">🏠</div>
                <h3>Nenhum bem cadastrado</h3>
                <p>Adicione imóveis, veículos e investimentos</p>
              </div>
            ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Bem</th>
                  <th>Tipo</th>
                  <th>Compra</th>
                  <th>Valor Atual</th>
                  <th>Ganho</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${assets.map(a => {
                  const gain = a.currentValue - a.purchaseValue;
                  const gainPct = a.purchaseValue > 0 ? ZUtils.pct(gain, a.purchaseValue) : 0;
                  const cfg = assetCatConfig[a.category] || assetCatConfig['Outros'];
                  return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px">
                        <span style="background:${cfg.bg}; padding:4px 7px; border-radius:7px; font-size:15px">${cfg.emoji}</span>
                        <span style="font-weight:600">${a.name}</span>
                      </div>
                    </td>
                    <td><span class="badge badge-gray">${a.category}</span></td>
                    <td style="color:var(--text-muted)">${a.purchaseDate ? ZUtils.formatDate(a.purchaseDate) : '—'}</td>
                    <td style="font-weight:700; color:var(--success)">${ZUtils.formatCurrencyShort(a.currentValue)}</td>
                    <td style="font-weight:600; color:${gain >= 0 ? 'var(--success)' : 'var(--danger)'}">
                      ${gain >= 0 ? '+' : ''}${ZUtils.formatCurrencyShort(gain)}
                      <span style="font-size:10px; color:var(--text-muted)"> (${gainPct > 0 ? '+' : ''}${gainPct}%)</span>
                    </td>
                    <td>
                      <button class="btn-icon" onclick="ZPatrimony.deleteAsset('${a.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
            <div style="padding:12px; border-top:2px solid var(--border); display:flex; justify-content:space-between; font-size:13px; font-weight:700">
              <span>Total de Ativos</span>
              <span style="color:var(--success)">${ZUtils.formatCurrency(totalAssets)}</span>
            </div>`}

            <!-- Composição por categoria -->
            ${Object.keys(assetsByCat).length > 0 ? `
            <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-light)">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px">Composição</div>
              ${Object.entries(assetsByCat).sort((a,b) => b[1]-a[1]).map(([cat, val]) => {
                const cfg = assetCatConfig[cat] || assetCatConfig['Outros'];
                const pct = totalAssets > 0 ? ZUtils.pct(val, totalAssets) : 0;
                return `
                <div class="progress-item">
                  <div class="prog-header">
                    <span class="prog-label">${cfg.emoji} ${cat}</span>
                    <span class="prog-value">${ZUtils.formatCurrencyShort(val)} · ${pct}%</span>
                  </div>
                  <div class="progress-bar" style="height:5px">
                    <div class="fill" style="width:${pct}%; background:${cfg.color}"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>` : ''}
          </div>

          <!-- Dívidas -->
          <div class="card">
            <div class="card-header">
              <h3>📋 Dívidas</h3>
              <button class="header-action-btn" style="padding:7px 12px; font-size:12px; background:var(--danger)" onclick="ZApp.openModal('addDebt', {})">
                + Cadastrar Dívida
              </button>
            </div>

            ${debts.length === 0 ? `
              <div class="empty-state" style="padding:30px">
                <div class="empty-icon">📋</div>
                <h3>Nenhuma dívida</h3>
                <p>Cadastre financiamentos e empréstimos</p>
              </div>
            ` : debts.map(d => {
              const progressPct = d.totalInstallments > 0 ? ZUtils.pct(d.totalInstallments - d.remainingInstallments, d.totalInstallments) : 0;
              return `
              <div style="padding:14px; border-bottom:1px solid var(--border-light); border-radius:var(--radius-sm)">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px">
                  <div>
                    <div style="font-size:14px; font-weight:700">${d.name}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px">${d.type}</div>
                  </div>
                  <div style="text-align:right; display:flex; align-items:center; gap:10px">
                    <div>
                      <div style="font-size:16px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrencyShort(d.remainingBalance)}</div>
                      <div style="font-size:10px; color:var(--text-muted)">saldo devedor</div>
                    </div>
                    <button class="btn-icon" onclick="ZPatrimony.deleteDebt('${d.id}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
                <div style="display:flex; gap:16px; font-size:12px; color:var(--text-muted); margin-bottom:8px">
                  <span>💳 Parcela: <strong style="color:var(--text)">${ZUtils.formatCurrencyShort(d.installmentValue)}</strong></span>
                  <span>📅 ${d.remainingInstallments}/${d.totalInstallments} restantes</span>
                  <span>📆 Término: ${ZUtils.formatDate(d.endDate)}</span>
                </div>
                <div class="progress-bar" style="height:6px; margin-bottom:4px">
                  <div class="fill green" style="width:${progressPct}%"></div>
                </div>
                <div style="font-size:10px; color:var(--text-muted)">${progressPct}% pago</div>
              </div>`;
            }).join('')}

            ${debts.length > 0 ? `
            <div style="padding:12px; border-top:2px solid var(--border); display:flex; justify-content:space-between; font-size:13px; font-weight:700">
              <span>Total de Dívidas</span>
              <span style="color:var(--danger)">${ZUtils.formatCurrency(totalDebts)}</span>
            </div>` : ''}

            <!-- Saúde patrimonial -->
            ${totalAssets > 0 ? `
            <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border-light)">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px">Saúde Patrimonial</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                <div style="padding:12px; background:var(--primary-light); border-radius:var(--radius-sm); text-align:center">
                  <div style="font-size:20px; font-weight:800; color:var(--primary)">${ZUtils.pct(totalAssets, totalAssets + totalDebts)}%</div>
                  <div style="font-size:11px; color:var(--text-secondary)">Ativos sobre total</div>
                </div>
                <div style="padding:12px; background:${netWorth >= 0 ? 'var(--success-light)' : 'var(--danger-light)'}; border-radius:var(--radius-sm); text-align:center">
                  <div style="font-size:20px; font-weight:800; color:${netWorth >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${totalDebts > 0 ? (totalAssets / totalDebts).toFixed(1) + 'x' : '∞'}
                  </div>
                  <div style="font-size:11px; color:var(--text-secondary)">Ativos / Dívidas</div>
                </div>
              </div>
            </div>` : ''}
          </div>
        </div>

      </div>
    `;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    const { data } = state;
    const { totalAssets, totalDebts, netWorth } = ZData.getNetWorth(data);
    const assets = data.assets || [];
    const debts = data.debts || [];

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Balanço Patrimonial</div>
          <h1>Patrimônio</h1>
        </div>
        <button style="background:var(--primary); border:none; border-radius:var(--radius-sm); padding:8px 12px; color:white; font-size:12px; font-weight:700; cursor:pointer"
          onclick="ZApp.openModal('addAsset', {})">
          + Adicionar
        </button>
      </div>

      <div class="screen-content">
        <div class="patrimony-hero ${netWorth < 0 ? 'negative' : ''}">
          <div class="ph-label">Patrimônio Líquido</div>
          <div class="ph-value">${ZUtils.formatCurrency(netWorth)}</div>
          <div class="ph-row">
            <div class="ph-item">
              <div class="phi-label">↑ Total de Ativos</div>
              <div class="phi-value">${ZUtils.formatCurrencyShort(totalAssets)}</div>
            </div>
            <div class="ph-item">
              <div class="phi-label">↓ Total de Dívidas</div>
              <div class="phi-value">${ZUtils.formatCurrencyShort(totalDebts)}</div>
            </div>
          </div>
        </div>

        <div style="padding:14px 16px 0">
          <div class="segmented">
            <button class="seg-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="ZPatrimony.setTab('overview')">Visão Geral</button>
            <button class="seg-btn ${activeTab === 'assets' ? 'active' : ''}" onclick="ZPatrimony.setTab('assets')">Bens (${assets.length})</button>
            <button class="seg-btn ${activeTab === 'debts' ? 'active' : ''}" onclick="ZPatrimony.setTab('debts')">Dívidas (${debts.length})</button>
          </div>
        </div>

        ${activeTab === 'overview' ? renderOverviewMobile(assets, debts, totalAssets, totalDebts, netWorth) : ''}
        ${activeTab === 'assets' ? renderAssetsMobile(assets, totalAssets) : ''}
        ${activeTab === 'debts' ? renderDebtsMobile(debts) : ''}

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  function renderOverviewMobile(assets, debts, totalAssets, totalDebts, netWorth) {
    const assetCatConfig = {
      'Imóvel':      { emoji: '🏠', bg: '#EFF6FF', color: '#3B82F6' },
      'Veículo':     { emoji: '🚗', bg: '#F5F3FF', color: '#8B5CF6' },
      'Investimento':{ emoji: '💰', bg: '#ECFDF5', color: '#10B981' },
      'Empresa':     { emoji: '🏢', bg: '#FFFBEB', color: '#F59E0B' },
      'Outros':      { emoji: '📦', bg: '#F5F5F4', color: '#78716C' }
    };
    const assetsByCat = {};
    assets.forEach(a => { assetsByCat[a.category] = (assetsByCat[a.category] || 0) + a.currentValue; });
    const debtsByType = {};
    debts.forEach(d => { debtsByType[d.type] = (debtsByType[d.type] || 0) + d.remainingBalance; });

    return `
      <div class="spacer-sm"></div>
      ${Object.keys(assetsByCat).length > 0 ? `
      <div class="section-header"><h2>Composição dos Bens</h2></div>
      <div class="card" style="margin-top:0">
        ${Object.entries(assetsByCat).sort((a,b) => b[1]-a[1]).map(([cat, val]) => {
          const cfg = assetCatConfig[cat] || assetCatConfig['Outros'];
          const pct = totalAssets > 0 ? ZUtils.pct(val, totalAssets) : 0;
          return `<div class="progress-item"><div class="prog-header"><span class="prog-label">${cfg.emoji} ${cat}</span><span class="prog-value">${ZUtils.formatCurrencyShort(val)} · ${pct}%</span></div><div class="progress-bar"><div class="fill blue" style="width:${pct}%; background:${cfg.color}"></div></div></div>`;
        }).join('')}
      </div>` : ''}
      ${Object.keys(debtsByType).length > 0 ? `
      <div class="section-header"><h2>Composição das Dívidas</h2></div>
      <div class="card" style="margin-top:0">
        ${Object.entries(debtsByType).sort((a,b) => b[1]-a[1]).map(([type, val]) => {
          const pct = totalDebts > 0 ? ZUtils.pct(val, totalDebts) : 0;
          return `<div class="progress-item"><div class="prog-header"><span class="prog-label">📋 ${type}</span><span class="prog-value">${ZUtils.formatCurrencyShort(val)} · ${pct}%</span></div><div class="progress-bar"><div class="fill red" style="width:${pct}%"></div></div></div>`;
        }).join('')}
      </div>` : ''}
      <div class="card">
        <div class="card-title">Saúde Patrimonial</div>
        ${totalAssets === 0 ? `<p style="font-size:13px; color:var(--text-muted)">Cadastre seus bens para ver a análise patrimonial.</p>` : `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
          <div style="text-align:center; padding:12px; background:var(--primary-light); border-radius:var(--radius-sm)">
            <div style="font-size:22px; font-weight:800; color:var(--primary)">${ZUtils.pct(totalAssets, totalAssets + totalDebts)}%</div>
            <div style="font-size:11px; color:var(--text-secondary)">Ativos sobre total</div>
          </div>
          <div style="text-align:center; padding:12px; background:${totalDebts > totalAssets ? 'var(--danger-light)' : 'var(--success-light)'}; border-radius:var(--radius-sm)">
            <div style="font-size:22px; font-weight:800; color:${totalDebts > totalAssets ? 'var(--danger)' : 'var(--success)'}">
              ${totalDebts > 0 ? (totalAssets / totalDebts).toFixed(1) + 'x' : '∞'}
            </div>
            <div style="font-size:11px; color:var(--text-secondary)">Ativos / Dívidas</div>
          </div>
        </div>
        ${netWorth >= 0 ? `<div style="margin-top:12px; padding:10px; background:var(--success-light); border-radius:var(--radius-sm); font-size:13px; color:var(--success); font-weight:500">✅ Patrimônio positivo. Seus bens superam suas dívidas.</div>`
        : `<div style="margin-top:12px; padding:10px; background:var(--danger-light); border-radius:var(--radius-sm); font-size:13px; color:var(--danger); font-weight:500">⚠️ Patrimônio negativo. Suas dívidas superam seus bens.</div>`}
        `}
      </div>
    `;
  }

  function renderAssetsMobile(assets, totalAssets) {
    const catConfig = { 'Imóvel': '🏠', 'Veículo': '🚗', 'Investimento': '💰', 'Empresa': '🏢', 'Terreno': '🌱', 'Outros': '📦' };
    return `
      <div class="spacer-sm"></div>
      <div style="padding:0 16px">
        <button class="btn btn-primary btn-block" onclick="ZApp.openModal('addAsset', {})">+ Cadastrar Bem ou Ativo</button>
      </div>
      <div class="spacer-sm"></div>
      ${assets.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-icon">🏠</div><h3>Nenhum bem cadastrado</h3><p>Adicione seus bens e ativos</p></div></div>` : `
      <div style="margin:0 16px; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
        ${assets.map(a => {
          const gain = a.currentValue - a.purchaseValue;
          const gainPct = ZUtils.pct(gain, a.purchaseValue);
          const emoji = catConfig[a.category] || '📦';
          return `
          <div class="patrimony-item">
            <div class="pi-icon" style="background:var(--primary-light)">${emoji}</div>
            <div class="pi-info"><div class="pi-name">${a.name}</div><div class="pi-cat">${a.category}${a.purchaseDate ? ' · ' + ZUtils.formatDate(a.purchaseDate) : ''}</div></div>
            <div class="pi-right">
              <div class="pi-value">${ZUtils.formatCurrencyShort(a.currentValue)}</div>
              <div class="pi-sub" style="color:${gain >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${gain >= 0 ? '+' : ''}${ZUtils.formatCurrencyShort(gain)} (${gainPct > 0 ? '+' : ''}${gainPct}%)
              </div>
            </div>
            <button class="btn-icon" onclick="ZPatrimony.deleteAsset('${a.id}')" style="margin-left:8px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>`;
        }).join('')}
      </div>
      <div style="margin:8px 16px; padding:12px 16px; background:var(--success-light); border-radius:var(--radius-sm)">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <span style="font-size:13px; font-weight:700">Total de Ativos</span>
          <span style="font-size:16px; font-weight:800; color:var(--success)">${ZUtils.formatCurrency(totalAssets)}</span>
        </div>
      </div>`}
    `;
  }

  function renderDebtsMobile(debts) {
    return `
      <div class="spacer-sm"></div>
      <div style="padding:0 16px">
        <button class="btn btn-primary btn-block" onclick="ZApp.openModal('addDebt', {})">+ Cadastrar Dívida</button>
      </div>
      <div class="spacer-sm"></div>
      ${debts.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-icon">📋</div><h3>Nenhuma dívida cadastrada</h3><p>Cadastre seus financiamentos e empréstimos</p></div></div>` : `
      <div style="margin:0 16px; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
        ${debts.map(d => {
          const progressPct = d.totalInstallments > 0 ? ZUtils.pct(d.totalInstallments - d.remainingInstallments, d.totalInstallments) : 0;
          return `
          <div style="padding:14px 16px; border-bottom:1px solid var(--border-light)">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:8px">
              <div style="flex:1"><div style="font-size:13px; font-weight:700">${d.name}</div><div style="font-size:11px; color:var(--text-muted); margin-top:2px">${d.type}</div></div>
              <div style="text-align:right">
                <div style="font-size:14px; font-weight:700; color:var(--danger)">${ZUtils.formatCurrencyShort(d.remainingBalance)}</div>
                <div style="font-size:11px; color:var(--text-muted)">saldo devedor</div>
              </div>
              <button class="btn-icon" onclick="ZPatrimony.deleteDebt('${d.id}')" style="margin-left:8px; margin-top:-2px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
            <div style="display:flex; gap:16px; font-size:11px; color:var(--text-muted); margin-bottom:8px">
              <span>💳 Parcela: <strong>${ZUtils.formatCurrencyShort(d.installmentValue)}</strong></span>
              <span>📅 ${d.remainingInstallments}/${d.totalInstallments} restantes</span>
            </div>
            <div class="progress-bar" style="height:5px"><div class="fill green" style="width:${progressPct}%"></div></div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:4px">${progressPct}% pago · término ${ZUtils.formatDate(d.endDate)}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin:8px 16px; padding:12px 16px; background:var(--danger-light); border-radius:var(--radius-sm)">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <span style="font-size:13px; font-weight:700">Total de Dívidas</span>
          <span style="font-size:16px; font-weight:800; color:var(--danger)">${ZUtils.formatCurrency(debts.reduce((s,d) => s + d.remainingBalance, 0))}</span>
        </div>
      </div>`}
    `;
  }

  function setTab(tab) {
    activeTab = tab;
    ZApp.render();
  }

  async function deleteAsset(id) {
    if (!confirm('Remover este bem?')) return;
    try {
      await ZDB.deleteAsset(id);
      ZApp.state.data.assets = ZApp.state.data.assets.filter(a => a.id !== id);
      ZApp.render();
    } catch(e) { alert(e.message); }
  }

  async function deleteDebt(id) {
    if (!confirm('Remover esta dívida?')) return;
    try {
      await ZDB.deleteDebt(id);
      ZApp.state.data.debts = ZApp.state.data.debts.filter(d => d.id !== id);
      ZApp.render();
    } catch(e) { alert(e.message); }
  }

  return { render, setTab, deleteAsset, deleteDebt };

})();
