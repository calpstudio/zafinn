/* ================================================
   ZAFINN - Tela: Contas Bancárias
   Mostra saldo disponível por conta
   ================================================ */

const ZAccounts = (function() {

  const TYPES = {
    digital:  { label: 'Conta Digital',  emoji: '📱' },
    checking: { label: 'Conta Corrente', emoji: '🏦' },
    savings:  { label: 'Poupança',       emoji: '🐷' },
    cash:     { label: 'Dinheiro',       emoji: '💵' }
  };

  const COLORS = ['#8B5CF6','#06B6D4','#F97316','#10B981','#3B82F6','#EF4444','#EC4899','#F59E0B','#0F0F0F','#1B4332'];

  function _fmt(v) {
    return 'R$ ' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function render(state) {
    const accounts = state.data.accountsWithBalance || [];
    const isLoading = state.data.accountsWithBalance === null;
    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const isDesktop = ZApp.isDesktop();

    return isDesktop ? renderDesktop(state, accounts, totalBalance, isLoading)
                     : renderMobile(state, accounts, totalBalance, isLoading);
  }

  function renderDesktop(state, accounts, totalBalance, isLoading) {
    return `
      <div class="screen-content">
        <!-- Cabeçalho + total -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px">
          <div>
            <div style="font-size:13px; color:var(--text-muted)">Saldo disponível agora</div>
            <div style="font-size:30px; font-weight:800; color:var(--text)">
              ${isLoading ? '...' : _fmt(totalBalance)}
            </div>
          </div>
          <button class="btn btn-primary" onclick="ZApp.openModal('addAccount', {})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova conta
          </button>
        </div>

        ${isLoading ? '<div style="text-align:center; padding:40px; color:var(--text-muted)">Carregando...</div>'
          : accounts.length === 0 ? _renderEmpty()
          : `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px">
               ${accounts.map(a => _renderCard(a)).join('')}
             </div>`
        }
      </div>
    `;
  }

  function renderMobile(state, accounts, totalBalance, isLoading) {
    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Dinheiro disponível</div>
          <h1>${isLoading ? '...' : _fmt(totalBalance)}</h1>
        </div>
        <button onclick="ZApp.openModal('addAccount', {})"
          style="background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); padding:10px 14px; font-size:13px; font-weight:700; cursor:pointer">
          +
        </button>
      </div>
      <div class="screen-content">
        <div class="spacer-sm"></div>
        ${isLoading ? '<div style="text-align:center; padding:40px; color:var(--text-muted)">Carregando...</div>'
          : accounts.length === 0 ? _renderEmpty()
          : `<div style="display:flex; flex-direction:column; gap:12px; padding:0 16px">
               ${accounts.map(a => _renderCard(a)).join('')}
             </div>`
        }
        <div class="spacer-lg"></div>
      </div>
    `;
  }

  function _renderCard(account) {
    const type = TYPES[account.type] || { label: account.type, emoji: '💳' };
    const balance = account.balance ?? 0;
    const isNeg = balance < 0;

    return `
      <div style="background:var(--card); border-radius:var(--radius); box-shadow:var(--shadow-sm); overflow:hidden">
        <div style="background:${account.color}; height:4px"></div>
        <div style="padding:18px 20px">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px">
            <div>
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px">
                ${type.emoji} ${type.label}
              </div>
              <div style="font-size:16px; font-weight:700; margin-top:3px">${account.name}</div>
            </div>
            <div style="display:flex; gap:2px">
              <button onclick="ZAccounts.openEdit('${account.id}')"
                style="background:none; border:none; cursor:pointer; padding:6px; color:var(--text-muted); border-radius:6px"
                onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onclick="ZAccounts.remove('${account.id}', '${account.name.replace(/'/g, "\\'")}')"
                style="background:none; border:none; cursor:pointer; padding:6px; color:var(--text-muted); border-radius:6px"
                onmouseover="this.style.background='var(--danger-light)'; this.style.color='var(--danger)'" onmouseout="this.style.background='none'; this.style.color='var(--text-muted)'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>

          <div style="font-size:26px; font-weight:800; color:${isNeg ? 'var(--danger)' : 'var(--text)'}">
            ${_fmt(balance)}
          </div>
          ${account.initialBalance !== 0 ? `
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px">
            Saldo inicial: ${_fmt(account.initialBalance)}
          </div>` : ''}

          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border-light)">
            <button onclick="ZApp.openModal('addTransaction', {account:'${account.name.replace(/'/g, "\\'")}', month:'${ZApp.state.month}'})"
              style="width:100%; padding:8px; background:${account.color}18; color:${account.color}; border:1px solid ${account.color}40; border-radius:var(--radius-sm); font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s"
              onmouseover="this.style.background='${account.color}30'" onmouseout="this.style.background='${account.color}18'">
              + Novo lançamento
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function _renderEmpty() {
    return `
      <div style="text-align:center; padding:60px 24px">
        <div style="font-size:52px; margin-bottom:16px">🏦</div>
        <div style="font-size:18px; font-weight:700; margin-bottom:8px">Nenhuma conta cadastrada</div>
        <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px">
          Cadastre Nubank, Inter, C6 e outras contas para acompanhar seu saldo disponível em tempo real
        </div>
        <button class="btn btn-primary" onclick="ZApp.openModal('addAccount', {})">+ Adicionar conta</button>
      </div>
    `;
  }

  async function remove(id, name) {
    if (!confirm(`Remover a conta "${name}"?\nOs lançamentos vinculados não serão apagados.`)) return;
    try {
      await ZDB.deleteAccount(id);
      ZApp.state.data.accounts = (ZApp.state.data.accounts || []).filter(a => a.id !== id);
      ZApp.state.data.accountsWithBalance = (ZApp.state.data.accountsWithBalance || []).filter(a => a.id !== id);
      ZApp.render();
    } catch(e) { alert('Erro: ' + e.message); }
  }

  function openEdit(id) {
    const acc = (ZApp.state.data.accountsWithBalance || ZApp.state.data.accounts || []).find(a => a.id === id);
    if (acc) ZApp.openModal('editAccount', { account: acc });
  }

  return { render, remove, openEdit, COLORS, TYPES };
})();
