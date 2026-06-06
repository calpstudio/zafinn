/* ================================================
   ZAFINN - Tela: Cartões de Crédito e Faturas
   ================================================ */

const ZCards = (function() {

  const CARD_COLORS = ['#0F0F0F','#1a1a2e','#16213e','#1B4332','#7B2D8B','#C0392B','#1A5276','#784212'];
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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

    if (cards.length === 0) return _renderEmpty();

    return `
      <div class="cards-page">
        <div class="cards-list">
          ${cards.map(c => _renderCardBlock(c, allTx)).join('')}
        </div>
        <div style="padding:0 20px 32px; text-align:center">
          <button class="btn btn-outline" onclick="ZApp.openModal('addCard')">+ Adicionar cartão</button>
        </div>
      </div>
    `;
  }

  function _renderCardBlock(card, allTx) {
    const cardTx = allTx.filter(tx =>
      (tx.account || '').toLowerCase().trim() === card.name.toLowerCase().trim()
    );

    const curKey  = _currentKey(card.closing_day);
    const prevKey = _prevKey(card.closing_day);

    const curTx  = cardTx.filter(tx => _billKey(tx.date, card.closing_day) === curKey);
    const prevTx = cardTx.filter(tx => _billKey(tx.date, card.closing_day) === prevKey);

    const curTotal  = curTx.reduce((s, t) => s + t.amount, 0);
    const prevTotal = prevTx.reduce((s, t) => s + t.amount, 0);

    const due     = _dueDate(curKey, card.due_day);
    const dueInfo = _dueText(due);

    const [cy, cm] = curKey.split('-').map(Number);
    const [py, pm] = prevKey.split('-').map(Number);
    const curLabel  = MONTHS[cm - 1] + (cy !== new Date().getFullYear() ? ` ${cy}` : '');
    const prevLabel = MONTHS[pm - 1] + (py !== new Date().getFullYear() ? ` ${py}` : '');

    const limitPct = card.limit_amount ? Math.min(100, (curTotal / card.limit_amount) * 100) : 0;
    const limitColor = limitPct >= 90 ? '#ef4444' : limitPct >= 70 ? '#f59e0b' : card.color;

    return `
      <div class="card-block">

        <!-- Cabeçalho visual do cartão -->
        <div class="card-visual" style="background:${card.color}">
          <div class="cv-top">
            <span class="cv-name">${card.name}</span>
            <div class="cv-chip">
              <div class="cv-chip-line"></div>
              <div class="cv-chip-line"></div>
              <div class="cv-chip-line"></div>
            </div>
          </div>
          <div class="cv-bottom">
            <div>
              <div class="cv-lbl">Fecha dia</div>
              <div class="cv-val">${String(card.closing_day).padStart(2,'0')}</div>
            </div>
            <div>
              <div class="cv-lbl">Vence dia</div>
              <div class="cv-val">${String(card.due_day).padStart(2,'0')}</div>
            </div>
            ${card.limit_amount ? `
            <div>
              <div class="cv-lbl">Limite</div>
              <div class="cv-val">${_fmt(card.limit_amount)}</div>
            </div>` : ''}
          </div>
        </div>

        <!-- Fatura aberta -->
        <div class="invoice-block open">
          <div class="invoice-top">
            <div>
              <div class="invoice-tag open-tag">Fatura aberta · ${curLabel}</div>
              <div class="invoice-due ${dueInfo.cls}">${dueInfo.text}</div>
            </div>
            <div class="invoice-total">${_fmt(curTotal)}</div>
          </div>

          ${card.limit_amount ? `
          <div class="limit-info">
            <div class="limit-track">
              <div class="limit-fill" style="width:${limitPct}%;background:${limitColor}"></div>
            </div>
            <div class="limit-text">${_fmt(curTotal)} de ${_fmt(card.limit_amount)} · ${limitPct.toFixed(0)}%</div>
          </div>` : ''}

          ${_renderTxList(curTx, 'Nenhum gasto nesta fatura')}
        </div>

        <!-- Fatura anterior -->
        <div class="invoice-block closed">
          <div class="invoice-top">
            <div>
              <div class="invoice-tag closed-tag">Fatura fechada · ${prevLabel}</div>
            </div>
            <div class="invoice-total muted">${_fmt(prevTotal)}</div>
          </div>
          ${_renderTxList(prevTx, 'Sem dados da fatura anterior', 3)}
        </div>

        <div class="card-actions">
          <button class="card-del-btn" onclick="ZCards.deleteCard('${card.id}')">Remover cartão</button>
        </div>
      </div>
    `;
  }

  function _renderTxList(txList, emptyMsg, limit = 5) {
    if (txList.length === 0) return `<div class="invoice-empty">${emptyMsg}</div>`;
    const sorted = [...txList].sort((a, b) => b.date.localeCompare(a.date));
    const shown = sorted.slice(0, limit);
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
        ${txList.length > limit ? `<div class="tx-more">+ ${txList.length - limit} lançamentos</div>` : ''}
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

  return { render, deleteCard, CARD_COLORS };

})();
