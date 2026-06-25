/* ================================================
   ZAFINN - Assistente IA (Chat)
   Painel flutuante com acesso aos dados financeiros
   e capacidade de executar ações no app.
   ================================================ */

const ZChat = (function() {

  let _open = false;
  let _messages = []; // {role: 'user'|'assistant', content: '', timestamp}
  let _loading = false;

  /* ---------- Controle do painel ---------- */
  function toggle() { _open ? close() : open(); }
  function open()   { _open = true;  _render(); }
  function close()  { _open = false; _render(); }

  function _render() {
    const el = document.getElementById('zchat-panel');
    if (el) el.outerHTML = _buildPanel();
    else {
      const div = document.createElement('div');
      div.id = 'zchat-root';
      div.innerHTML = _buildPanel();
      document.body.appendChild(div);
    }
    if (_open) {
      setTimeout(() => {
        const input = document.getElementById('zchat-input');
        if (input) input.focus();
        _scrollToBottom();
      }, 50);
    }
  }

  function _buildPanel() {
    if (!_open) return `<div id="zchat-panel" style="display:none"></div>`;

    const isDesktop = window.innerWidth >= 1024;

    return `
      <div id="zchat-panel" style="
        position:fixed;
        ${isDesktop
          ? 'right:24px; bottom:80px; width:380px; height:560px; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,0.18);'
          : 'left:0; right:0; bottom:0; height:85vh; border-radius:16px 16px 0 0; box-shadow:0 -4px 30px rgba(0,0,0,0.15);'}
        background:var(--card);
        display:flex; flex-direction:column;
        z-index:1000;
        border:1px solid var(--border);
        overflow:hidden;
      ">
        <!-- Header -->
        <div style="display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid var(--border); background:linear-gradient(135deg, var(--primary) 0%, #337418 100%)">
          <div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:16px">✨</div>
          <div style="flex:1">
            <div style="font-size:14px; font-weight:700; color:white">Assistente ZAFINN</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.75)">Pergunte, lance, organize</div>
          </div>
          <button onclick="ZChat.close()" style="background:rgba(255,255,255,0.15); border:none; border-radius:8px; padding:6px 10px; color:white; cursor:pointer; font-size:16px; line-height:1">×</button>
        </div>

        <!-- Mensagens -->
        <div id="zchat-messages" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px">
          ${_messages.length === 0 ? _renderWelcome() : _messages.map(_renderMessage).join('')}
          ${_loading ? _renderLoading() : ''}
        </div>

        <!-- Input -->
        <div style="padding:12px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:flex-end">
          <textarea id="zchat-input" placeholder="Pergunte ou peça algo... Ex: &quot;Gastei R$ 50 no iFood hoje&quot;"
            style="flex:1; resize:none; border:1px solid var(--border); border-radius:10px; padding:10px 12px; font-size:13px; font-family:inherit; background:var(--bg); color:var(--text); outline:none; max-height:100px; min-height:40px; line-height:1.4"
            rows="1"
            onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); ZChat.send(); }"
            oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,100)+'px'"
          ></textarea>
          <button onclick="ZChat.send()"
            style="background:var(--primary); color:white; border:none; border-radius:10px; padding:10px 14px; cursor:pointer; font-size:18px; flex-shrink:0; height:40px; display:flex; align-items:center; justify-content:center"
            ${_loading ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function _renderWelcome() {
    const suggestions = [
      'Qual meu saldo este mês?',
      'Quanto gastei em alimentação?',
      'Lança R$ 50 no iFood hoje',
      'Resumo das minhas dívidas',
    ];
    return `
      <div style="text-align:center; padding:16px 0">
        <div style="font-size:32px; margin-bottom:8px">✨</div>
        <div style="font-size:14px; font-weight:600; margin-bottom:4px">Olá! Sou seu assistente financeiro.</div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:16px">Posso lançar gastos, responder perguntas e organizar suas finanças.</div>
        <div style="display:flex; flex-direction:column; gap:6px">
          ${suggestions.map(s => `
            <button onclick="ZChat.sendQuick('${s.replace(/'/g, "\\'")}')"
              style="background:var(--bg); border:1px solid var(--border); border-radius:20px; padding:8px 14px; font-size:12px; cursor:pointer; color:var(--text); text-align:left; transition:all 0.15s"
              onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)'"
              onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text)'">
              ${s}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function _renderMessage(msg) {
    const isUser = msg.role === 'user';
    return `
      <div style="display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'}; gap:2px">
        <div style="
          max-width:85%; padding:10px 13px; border-radius:${isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
          background:${isUser ? 'var(--primary)' : 'var(--bg)'};
          color:${isUser ? 'white' : 'var(--text)'};
          font-size:13px; line-height:1.5;
          border:${isUser ? 'none' : '1px solid var(--border)'};
        ">
          ${_formatMessage(msg.content)}
        </div>
        ${msg.action ? _renderActionChip(msg.action) : ''}
      </div>
    `;
  }

  function _renderActionChip(action) {
    const labels = {
      addTransaction: '✅ Lançamento adicionado',
      deleteTransaction: '🗑️ Lançamento removido',
      navigate: '📍 Navegando...',
      openImport: '📂 Importação aberta',
    };
    return `<div style="font-size:11px; color:var(--success); font-weight:600; padding:2px 8px">${labels[action] || '⚡ Ação executada'}</div>`;
  }

  function _renderLoading() {
    return `
      <div style="display:flex; align-items:flex-start; gap:8px">
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px 14px 14px 4px; padding:12px 14px">
          <div style="display:flex; gap:4px; align-items:center">
            <div style="width:6px; height:6px; border-radius:50%; background:var(--text-muted); animation:zchat-bounce 1.2s infinite"></div>
            <div style="width:6px; height:6px; border-radius:50%; background:var(--text-muted); animation:zchat-bounce 1.2s 0.2s infinite"></div>
            <div style="width:6px; height:6px; border-radius:50%; background:var(--text-muted); animation:zchat-bounce 1.2s 0.4s infinite"></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes zchat-bounce {
          0%,80%,100%{transform:scale(0.6);opacity:0.4}
          40%{transform:scale(1);opacity:1}
        }
      </style>
    `;
  }

  function _formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function _scrollToBottom() {
    const el = document.getElementById('zchat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  /* ---------- Enviar mensagem ---------- */
  function sendQuick(text) {
    const input = document.getElementById('zchat-input');
    if (input) input.value = text;
    send();
  }

  async function send() {
    const input = document.getElementById('zchat-input');
    const text = input?.value?.trim();
    if (!text || _loading) return;

    input.value = '';
    input.style.height = 'auto';

    _messages.push({ role: 'user', content: text, timestamp: Date.now() });
    _loading = true;
    _render();

    try {
      const context = _buildContext();
      const result = await ZAI.chat(_messages.slice(0, -1), text, context);

      let responseText = result.message || result;
      let action = result.action || null;

      if (action) {
        await _executeAction(action);
      }

      _messages.push({
        role: 'assistant',
        content: responseText,
        action: action?.type,
        timestamp: Date.now()
      });
    } catch(e) {
      _messages.push({
        role: 'assistant',
        content: `Erro ao processar: ${e.message}. Verifique se a chave Claude está configurada em Configurações.`,
        timestamp: Date.now()
      });
    }

    _loading = false;
    _render();
  }

  /* ---------- Executar ações ---------- */
  async function _executeAction(action) {
    const state = ZApp.state;
    const month = state.month;

    switch(action.type) {
      case 'addTransaction': {
        const tx = {
          id: ZUtils.generateId(),
          date: action.data.date || new Date().toISOString().slice(0,10),
          description: action.data.description,
          amount: parseFloat(action.data.amount),
          type: action.data.type || 'expense',
          category: action.data.category || 'Outros',
          account: action.data.account || '',
          notes: ''
        };
        const txMonth = action.data.month || tx.date.substring(0,7);
        await ZDB.addTransaction(txMonth, tx);
        if (!state.data.months[txMonth])
          state.data.months[txMonth] = { transactions: [], budget: { incomes: [], expenses: [] } };
        state.data.months[txMonth].transactions.unshift(tx);
        if (state.screen === 'transactions' || state.screen === 'dashboard') ZApp.render();
        break;
      }

      case 'deleteTransaction': {
        const txList = (state.data.months[month]?.transactions || []);
        const idx = txList.findIndex(t =>
          t.description?.toLowerCase().includes((action.data.description || '').toLowerCase())
        );
        if (idx !== -1) {
          const tx = txList[idx];
          await ZDB.deleteTransaction(month, tx.id);
          state.data.months[month].transactions.splice(idx, 1);
          if (state.screen === 'transactions') ZApp.render();
        }
        break;
      }

      case 'navigate': {
        if (action.data?.month) state.month = action.data.month;
        ZApp.navigate(action.data.screen || 'dashboard');
        break;
      }

      case 'openImport': {
        ZApp.openModal('importTransactions', { month });
        break;
      }
    }
  }

  /* ---------- Contexto financeiro ---------- */
  function _buildContext() {
    const state = ZApp.state;
    const month = state.month;
    const data = state.data;
    const totals = ZData.getMonthTotals(data, month);
    const monthData = data.months?.[month] || {};
    const txs = (monthData.transactions || []).slice(0, 30);
    const cards = data.creditCards || [];
    const accounts = data.accounts || [];

    const today = new Date().toLocaleDateString('pt-BR');

    const txLines = txs.length > 0
      ? txs.map(t => `• ${t.date} | ${t.description} | ${t.type === 'expense' ? '-' : '+'}R$${t.amount.toFixed(2)} | ${t.category} | ${t.account || 'sem conta'}`).join('\n')
      : '(nenhuma transação neste mês)';

    return `
HOJE: ${today}
MÊS VISUALIZADO: ${month}
RECEITAS DO MÊS: R$ ${totals.realIncome.toFixed(2)}
DESPESAS DO MÊS: R$ ${totals.realExpense.toFixed(2)}
SALDO DO MÊS: R$ ${(totals.realIncome - totals.realExpense).toFixed(2)}

ÚLTIMAS TRANSAÇÕES:
${txLines}

CARTÕES CADASTRADOS:
${cards.length > 0 ? cards.map(c => `• ${c.name} — fecha dia ${c.closing_day}, vence dia ${c.due_day}`).join('\n') : '(nenhum)'}

CONTAS CADASTRADAS:
${accounts.length > 0 ? accounts.map(a => `• ${a.name} (${a.type})`).join('\n') : '(nenhuma)'}

CATEGORIAS DISPONÍVEIS:
${(data.categories?.expenses || []).join(', ')}
`.trim();
  }

  /* ---------- Init: injeta estilos e botão flutuante ---------- */
  function init() {
    const btn = document.getElementById('zchat-fab');
    if (!btn) {
      const fab = document.createElement('button');
      fab.id = 'zchat-fab';
      fab.onclick = toggle;
      fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
      fab.style.cssText = `
        position:fixed; bottom:88px; right:20px; z-index:999;
        width:52px; height:52px; border-radius:50%;
        background:var(--primary); color:white;
        border:none; cursor:pointer;
        box-shadow:0 4px 20px rgba(0,0,0,0.25);
        display:flex; align-items:center; justify-content:center;
        transition:transform 0.2s, box-shadow 0.2s;
      `;
      fab.onmouseover = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 6px 28px rgba(0,0,0,0.3)'; };
      fab.onmouseout  = () => { fab.style.transform = 'scale(1)';    fab.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; };
      document.body.appendChild(fab);
    }

    const panel = document.getElementById('zchat-root');
    if (!panel) {
      const div = document.createElement('div');
      div.id = 'zchat-root';
      div.innerHTML = `<div id="zchat-panel" style="display:none"></div>`;
      document.body.appendChild(div);
    }
  }

  return { toggle, open, close, send, sendQuick, init };
})();
