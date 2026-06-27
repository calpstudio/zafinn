/* ================================================
   ZAFINN - Tela: Cartões de Crédito e Faturas
   ================================================ */

const ZCards = (function() {

  const CARD_COLORS = ['#0F0F0F','#1a1a2e','#16213e','#1B4332','#7B2D8B','#C0392B','#1A5276','#784212'];
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const _expanded = new Set(); // IDs de faturas expandidas: `${cardId}-cur` ou `${cardId}-prev`

  function toggleExpand(key) {
    if (_expanded.has(key)) _expanded.delete(key);
    else _expanded.add(key);
    ZApp.render();
  }

  function _fmt(v) {
    return 'R$ ' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _fmtDate(dateStr) {
    if (!dateStr) return '';
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  /* ---------- Lógica de período de fatura ---------- */

  // Retorna chave "YYYY-MM" do mês de vencimento da fatura que a data pertence
  function _billKey(dateStr, closingDay) {
    const d = new Date(dateStr + 'T12:00:00');
    let year = d.getFullYear();
    let month = d.getMonth(); // 0-indexed
    if (d.getDate() > closingDay) {
      month++;
      if (month > 11) { month = 0; year++; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  // Chave da fatura atual (aberta)
  function _currentKey(closingDay) {
    const today = new Date();
    return _billKey(today.toISOString().slice(0, 10), closingDay);
  }

  // Chave da fatura anterior (fechada)
  function _prevKey(closingDay) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-indexed
    // Retrocede um mês de vencimento
    if (today.getDate() > closingDay) {
      // estamos na fatura do próximo mês → anterior é este mês
    } else {
      // estamos na fatura deste mês → anterior é o mês passado
      month--;
      if (month < 0) { month = 11; year--; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  // Data de vencimento de uma fatura
  function _dueDate(billKey, dueDay) {
    const [year, month] = billKey.split('-').map(Number);
    return new Date(year, month - 1, dueDay);
  }

  // Texto de dias até o vencimento
  function _dueText(dueDate) {
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((dueDate - today) / 86400000);
    if (diff < 0) return { text: `Vencida há ${Math.abs(diff)}d`, cls: 'overdue' };
    if (diff === 0) return { text: 'Vence hoje', cls: 'urgent' };
    if (diff <= 5)  return { text: `Vence em ${diff}d`, cls: 'urgent' };
    return { text: `Vence em ${diff}d`, cls: '' };
  }

  /* ---------- Coletar transações de todos os meses ---------- */
  function _allExpenseTx(state) {
    const seen = new Set();
    const list = [];
    Object.values(state.data.months || {}).forEach(m => {
      (m.transactions || []).forEach(tx => {
        if (tx.type === 'expense' && !seen.has(tx.id)) {
          seen.add(tx.id); list.push(tx);
        }
      });
    });
    (state.data.cardTransactions || []).forEach(tx => {
      if (!seen.has(tx.id)) { seen.add(tx.id); list.push(tx); }
    });
    return list;
  }

  /* ---------- Render principal ---------- */
  function render(state) {
    const cards = state.data.creditCards || [];
    const allTx = _allExpenseTx(state);
    const month = state.month;

    if (cards.length === 0) return _renderEmpty();

    return `
      <div class="cards-page">

        <!-- Ações rápidas -->
        <div style="display:flex; gap:10px; padding:16px 20px 0; flex-wrap:wrap">
          <button onclick="ZApp.openModal('importTransactions', {month:'${month}', fromCards:true})"
            style="display:flex; align-items:center; gap:8px; padding:10px 18px; background:var(--primary); color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(93,214,44,0.3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Importar Fatura
          </button>
          <button onclick="ZApp.openModal('addCard')"
            style="display:flex; align-items:center; gap:8px; padding:10px 18px; background:var(--card); color:var(--text-secondary); border:1px solid var(--border); border-radius:10px; font-size:13px; font-weight:600; cursor:pointer">
            + Adicionar cartão
          </button>
        </div>

        <div class="cards-list">
          ${cards.map(c => _renderCardBlock(c, allTx)).join('')}
        </div>
      </div>
    `;
  }

  function _renderCardBlock(card, allTx) {
    const cardTx = allTx.filter(tx =>
      (tx.account || '').toLowerCase().trim() === card.name.toLowerCase().trim()
    );

    const curKey = _currentKey(card.closing_day);
    const prevKey = _prevKey(card.closing_day);
    const _txBillKey = tx => tx.yearMonth || tx.year_month || _billKey(tx.date, card.closing_day);

    // Monta lista unificada de todos os períodos (atual + anteriores com dados)
    const periodSet = new Set([curKey, prevKey]);
    cardTx.forEach(tx => periodSet.add(_txBillKey(tx)));
    const allPeriods = [...periodSet].sort((a, b) => b.localeCompare(a));

    const curTx   = cardTx.filter(tx => _txBillKey(tx) === curKey);
    const curTotal = curTx.reduce((s, t) => s + t.amount, 0);
    const due      = _dueDate(curKey, card.due_day);
    const dueInfo  = _dueText(due);

    const limitPct   = card.limit_amount ? Math.min(100, (curTotal / card.limit_amount) * 100) : 0;
    const limitColor = limitPct >= 90 ? '#ef4444' : limitPct >= 70 ? '#f59e0b' : 'rgba(255,255,255,0.9)';

    return `
      <div class="card-block" style="border-radius:16px; overflow:hidden; margin-bottom:20px; box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <!-- Cabeçalho compacto colorido -->
        <div style="background:${card.color}; padding:16px 18px">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px">
            <span style="font-size:17px; font-weight:800; color:white; letter-spacing:0.3px">${card.name}</span>
            <button onclick="ZCards.deleteCard('${card.id}')"
              style="background:rgba(0,0,0,0.25); border:none; border-radius:8px; padding:5px 10px; color:rgba(255,255,255,0.85); font-size:11px; font-weight:600; cursor:pointer">
              Remover
            </button>
          </div>
          <div style="display:flex; gap:20px; align-items:center">
            <div>
              <div style="font-size:10px; color:rgba(255,255,255,0.6); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Fecha</div>
              <div style="font-size:16px; font-weight:800; color:white">dia ${String(card.closing_day).padStart(2,'0')}</div>
            </div>
            <div>
              <div style="font-size:10px; color:rgba(255,255,255,0.6); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Vence</div>
              <div style="font-size:16px; font-weight:800; color:white">dia ${String(card.due_day).padStart(2,'0')}</div>
            </div>
            ${card.limit_amount ? `
            <div style="margin-left:auto; text-align:right">
              <div style="font-size:10px; color:rgba(255,255,255,0.6); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Limite</div>
              <div style="font-size:14px; font-weight:800; color:white">${_fmt(card.limit_amount)}</div>
            </div>` : ''}
          </div>
          ${card.limit_amount && curTotal > 0 ? `
          <div style="margin-top:12px">
            <div style="background:rgba(0,0,0,0.2); border-radius:4px; height:4px; overflow:hidden">
              <div style="background:${limitColor}; width:${limitPct}%; height:100%; border-radius:4px; transition:width 0.4s"></div>
            </div>
            <div style="font-size:11px; color:rgba(255,255,255,0.65); margin-top:4px">
              ${_fmt(curTotal)} usados de ${_fmt(card.limit_amount)} · ${limitPct.toFixed(0)}%
            </div>
          </div>` : ''}
        </div>

        <!-- Lista unificada de faturas -->
        <div style="background:var(--card); border:1px solid var(--border); border-top:none">
          ${allPeriods.map((key, i) => {
            const [ky, km] = key.split('-').map(Number);
            const label = MONTHS[km - 1] + ' ' + ky;
            const txs = cardTx.filter(tx => _txBillKey(tx) === key);
            const total = txs.reduce((s, t) => s + t.amount, 0);
            const expandKey = `${card.id}-p-${key}`;
            const isExpanded = _expanded.has(expandKey);
            const isCur = key === curKey;
            const isPrev = key === prevKey;
            const hasData = txs.length > 0;
            const isLast = i === allPeriods.length - 1;

            // Badge de status
            const badge = isCur
              ? `<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; background:rgba(93,214,44,0.15); color:var(--primary); white-space:nowrap">${dueInfo.text}</span>`
              : (isPrev && hasData)
              ? `<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; background:rgba(239,68,68,0.1); color:var(--danger)">Fechada</span>`
              : '';

            return `
              <div style="border-bottom:${isLast ? 'none' : '1px solid var(--border)'}">
                <div onclick="${hasData ? `ZCards.toggleExpand('${expandKey}')` : ''}"
                  style="display:flex; align-items:center; gap:12px; padding:14px 18px; cursor:${hasData ? 'pointer' : 'default'}; background:${isExpanded ? 'var(--bg)' : 'transparent'}; transition:background 0.15s">
                  <div style="flex:1; min-width:0">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap">
                      <span style="font-size:15px; font-weight:700; color:var(--text)">${label}</span>
                      ${badge}
                    </div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px">
                      ${hasData ? `${txs.length} lançamento${txs.length > 1 ? 's' : ''}` : 'Sem lançamentos'}
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0">
                    <span style="font-size:16px; font-weight:800; color:${hasData ? 'var(--danger)' : 'var(--text-muted)'}">
                      ${_fmt(total)}
                    </span>
                    ${hasData ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"
                      style="color:var(--text-muted); transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0)'}; transition:transform 0.2s; flex-shrink:0">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>` : '<div style="width:16px"></div>'}
                  </div>
                </div>
                ${isExpanded && hasData ? `
                  <div style="border-top:1px solid var(--border); background:var(--bg)">
                    ${_renderTxList(txs, '', expandKey, 50)}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  function _renderTxList(txList, emptyMsg, expandKey, limit = 5) {
    if (txList.length === 0) return `<div class="invoice-empty">${emptyMsg}</div>`;
    const sorted = [...txList].sort((a, b) => b.date.localeCompare(a.date));
    const isExpanded = _expanded.has(expandKey);
    const shown = isExpanded ? sorted : sorted.slice(0, limit);
    const remaining = sorted.length - limit;
    return `
      <div class="invoice-tx-list">
        ${shown.map(tx => `
          <div class="invoice-tx-row">
            <div class="tx-info">
              <span class="tx-cat">${tx.category}</span>
              <span class="tx-desc">${tx.description}</span>
            </div>
            <div class="tx-right">
              <span class="tx-date">${_fmtDate(tx.date)}</span>
              <span class="tx-val">${_fmt(tx.amount)}</span>
            </div>
          </div>
        `).join('')}
        ${sorted.length > limit ? `
          <div class="tx-more" onclick="ZCards.toggleExpand('${expandKey}')" style="cursor:pointer; color:var(--primary); font-weight:600; padding:10px; text-align:center; border-top:1px solid var(--border)">
            ${isExpanded ? '▲ Mostrar menos' : `▼ Ver mais ${remaining} lançamento${remaining > 1 ? 's' : ''}`}
          </div>` : ''}
      </div>
    `;
  }

  function _renderEmpty() {
    return `
      <div class="empty-state" style="padding:60px 24px; text-align:center">
        <div style="font-size:52px; margin-bottom:16px">💳</div>
        <div style="font-size:18px; font-weight:700; margin-bottom:8px">Nenhum cartão cadastrado</div>
        <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px">
          Adicione seus cartões para acompanhar as faturas automaticamente
        </div>
        <button class="btn btn-primary" onclick="ZApp.openModal('addCard')">+ Adicionar cartão</button>
      </div>
    `;
  }

  /* ---------- Ações ---------- */
  async function deleteCard(id) {
    if (!confirm('Remover este cartão? Os lançamentos não serão apagados.')) return;
    try {
      await ZDB.deleteCreditCard(id);
      ZApp.state.data.creditCards = (ZApp.state.data.creditCards || []).filter(c => c.id !== id);
      ZApp.navigate('cards');
    } catch(e) { alert(e.message); }
  }

  return { render, deleteCard, toggleExpand, CARD_COLORS };

})();
