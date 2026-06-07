/* ================================================
   ZAFINN - Modais e Formulários
   ================================================ */

const ZModals = (function() {

  /* ---------- Renderizar modal por tipo ---------- */
  function render(type, params) {
    switch(type) {
      case 'addTransaction':      return renderAddTransaction(params);
      case 'editTransaction':     return renderEditTransaction(params);
      case 'addBudgetItem':       return renderAddBudgetItem(params);
      case 'addAsset':            return renderAddAsset(params);
      case 'addDebt':             return renderAddDebt(params);
      case 'addFutureItem':       return renderAddFutureItem(params);
      case 'importTransactions':  return renderImport(params);
      case 'aiAnalysis':          return renderAiAnalysis(params);
      case 'addGoal':             return renderAddGoal(params);
      case 'contributeGoal':      return renderContributeGoal(params);
      case 'onboarding':          return renderOnboarding(params);
      case 'addCard':             return renderAddCard(params);
      default: return '';
    }
  }

  /* ---------- Fechar modal ---------- */
  function close() {
    ZApp.closeModal();
  }

  /* ================================================
     FORMULÁRIO: Adicionar/Editar Transação
     ================================================ */
  function renderAddTransaction(params) {
    const isEdit = !!params.txId;
    const { data, month } = ZApp.state;
    const tx = isEdit ? (data.months[month]?.transactions || []).find(t => t.id === params.txId) : null;

    const today = new Date().toISOString().slice(0, 10);
    const cats = data.categories;

    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>${isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <!-- Tipo -->
        <div class="form-group">
          <div class="segmented" id="tx-type-selector">
            <button class="seg-btn expense ${!tx || tx.type === 'expense' ? 'active' : ''}" onclick="ZModals.setTxType('expense')">↓ Despesa</button>
            <button class="seg-btn income ${tx?.type === 'income' ? 'active' : ''}" onclick="ZModals.setTxType('income')">↑ Receita</button>
          </div>
        </div>

        <!-- Valor -->
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input large" id="tx-amount" placeholder="0,00" min="0" step="0.01"
            value="${tx ? tx.amount : ''}" inputmode="decimal">
        </div>

        <!-- Descrição -->
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input type="text" class="form-input" id="tx-desc" placeholder="Ex: Supermercado, Salário..."
            value="${tx ? tx.description : ''}">
        </div>

        <!-- Data -->
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" class="form-input" id="tx-date" value="${tx ? tx.date : today}">
        </div>

        <!-- Categoria -->
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <div class="category-picker" id="tx-cat-picker">
            ${renderCategoryChips(cats.expenses, tx?.category, 'expense')}
          </div>
        </div>

        <!-- Conta / Cartão -->
        <div class="form-group">
          <label class="form-label">Conta / Cartão</label>
          ${(function() {
            const cards = ZApp.state.data.creditCards || [];
            const currentAccount = tx ? (tx.account || '') : '';
            const isCard = cards.some(c => c.name === currentAccount);
            const isOther = currentAccount && !isCard;

            if (cards.length === 0) {
              return `<input type="text" class="form-input" id="tx-account" placeholder="Ex: Nubank, Dinheiro, PIX..." value="${currentAccount}">
              <div style="font-size:11px; color:var(--text-muted); margin-top:6px">
                💡 Cadastre seus cartões em <strong>Planejamento → Cartões</strong> para selecioná-los aqui
              </div>`;
            }

            return `
              <input type="hidden" id="tx-account" value="${currentAccount}">
              <div class="account-picker" id="tx-account-picker">
                ${cards.map(c => `
                  <button type="button" class="acc-chip ${c.name === currentAccount ? 'selected' : ''}"
                    onclick="ZModals.selectTxAccount('${c.name.replace(/'/g, "\\'")}', this)"
                    style="--acc-color:${c.color}">
                    <span class="acc-dot" style="background:${c.color}"></span>${c.name}
                  </button>
                `).join('')}
                <button type="button" class="acc-chip ${isOther ? 'selected' : ''}" id="acc-chip-other"
                  onclick="ZModals.showOtherAccount(this)">Outra conta</button>
              </div>
              <input type="text" class="form-input" id="tx-account-other"
                style="display:${isOther ? 'block' : 'none'}; margin-top:8px"
                placeholder="Ex: Banco, Dinheiro, PIX..."
                value="${isOther ? currentAccount : ''}"
                oninput="document.getElementById('tx-account').value=this.value">
            `;
          })()}
        </div>

        <!-- Observação -->
        <div class="form-group">
          <label class="form-label">Observação (opcional)</label>
          <input type="text" class="form-input" id="tx-notes" placeholder="Anotação livre..."
            value="${tx ? (tx.notes || '') : ''}">
        </div>

        <!-- Recorrência (apenas novo lançamento) -->
        ${!isEdit ? `
        <div class="form-group">
          <label class="form-label">Recorrência</label>
          <input type="hidden" id="tx-mode-input" value="normal">
          <div class="segmented" id="tx-mode-selector">
            <button class="seg-btn active" onclick="ZModals.setTxMode('normal', this)">Pontual</button>
            <button class="seg-btn" onclick="ZModals.setTxMode('recurring', this)">Recorrente</button>
            <button class="seg-btn" onclick="ZModals.setTxMode('installment', this)">Parcelado</button>
          </div>
          <div id="tx-installment-extra" style="display:none; margin-top:10px">
            <label class="form-label">Número de parcelas</label>
            <input type="number" class="form-input" id="tx-installments" placeholder="Ex: 12" min="2" max="360" inputmode="numeric">
          </div>
          <div id="tx-mode-hint" style="display:none; margin-top:8px; font-size:12px; color:var(--text-muted); line-height:1.5"></div>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" onclick="ZModals.deleteTx('${tx.id}')">Excluir</button>` : ''}
        <button class="btn btn-primary" style="flex:2" onclick="ZModals.saveTx('${isEdit ? tx.id : ''}')">
          ${isEdit ? 'Salvar' : 'Lançar'}
        </button>
      </div>
    `;
  }

  function renderEditTransaction(params) {
    return renderAddTransaction(params);
  }

  function setTxMode(mode, btn) {
    document.querySelectorAll('#tx-mode-selector .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('tx-mode-input');
    if (input) input.value = mode;
    const extra = document.getElementById('tx-installment-extra');
    if (extra) extra.style.display = mode === 'installment' ? 'block' : 'none';
    const hint = document.getElementById('tx-mode-hint');
    if (hint) {
      if (mode === 'recurring') {
        hint.textContent = 'Esta despesa será lançada automaticamente todo mês a partir de agora.';
        hint.style.display = 'block';
      } else if (mode === 'installment') {
        hint.textContent = 'O valor informado é o valor de cada parcela. Informe em quantas vezes foi parcelado.';
        hint.style.display = 'block';
      } else {
        hint.style.display = 'none';
      }
    }
  }

  function selectTxAccount(name, btn) {
    document.querySelectorAll('#tx-account-picker .acc-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('tx-account').value = name;
    const otherInput = document.getElementById('tx-account-other');
    if (otherInput) otherInput.style.display = 'none';
  }

  function showOtherAccount(btn) {
    document.querySelectorAll('#tx-account-picker .acc-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('tx-account').value = '';
    const otherInput = document.getElementById('tx-account-other');
    if (otherInput) { otherInput.style.display = 'block'; otherInput.focus(); }
  }

  let currentTxType = 'expense';

  function setTxType(type) {
    currentTxType = type;
    const { data } = ZApp.state;
    const cats = data.categories;

    document.querySelectorAll('#tx-type-selector .seg-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`#tx-type-selector .seg-btn.${type}`).classList.add('active');

    const picker = document.getElementById('tx-cat-picker');
    if (picker) {
      picker.innerHTML = renderCategoryChips(type === 'income' ? cats.incomes : cats.expenses, null, type);
    }
  }

  function renderCategoryChips(cats, selected, type) {
    return (cats || []).map(cat => {
      const cfg = ZUtils.getCatConfig(cat);
      return `<div class="cat-chip ${selected === cat ? 'selected' : ''}" onclick="ZModals.selectCat(this, '${cat}')" data-cat="${cat}">
        <span>${cfg.emoji}</span> ${cat}
      </div>`;
    }).join('');
  }

  function selectCat(el, cat) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  async function saveTx(editId) {
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const desc = document.getElementById('tx-desc').value.trim();
    const date = document.getElementById('tx-date').value;
    const otherInput = document.getElementById('tx-account-other');
    const account = (otherInput && otherInput.style.display !== 'none')
      ? otherInput.value.trim()
      : document.getElementById('tx-account').value.trim();
    const notes = document.getElementById('tx-notes').value.trim();
    const selectedCat = document.querySelector('.cat-chip.selected')?.dataset?.cat || '';
    const type = document.querySelector('#tx-type-selector .seg-btn.active')?.classList.contains('income') ? 'income' : 'expense';
    const mode = document.getElementById('tx-mode-input')?.value || 'normal';

    if (!amount || amount <= 0) { alert('Informe o valor da transação'); return; }
    if (!desc) { alert('Informe a descrição'); return; }
    if (!date) { alert('Informe a data'); return; }
    if (!selectedCat) { alert('Selecione uma categoria'); return; }

    let installments = null;
    if (!editId && mode === 'installment') {
      installments = parseInt(document.getElementById('tx-installments')?.value);
      if (!installments || installments < 2) { alert('Informe o número de parcelas (mínimo 2)'); return; }
    }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const { month } = ZApp.state;

    try {
      if (editId) {
        const tx = { id: editId, amount, description: desc, date, type, category: selectedCat, account, notes };
        await ZDB.updateTransaction(month, tx);
        const txs = ZApp.state.data.months[month]?.transactions || [];
        const idx = txs.findIndex(t => t.id === editId);
        if (idx >= 0) txs[idx] = tx;
      } else {
        // Calcular número correto da parcela baseado na data informada vs mês atual
        let firstInstallNum = 1;
        let startMonth = date.substring(0, 7);

        if (mode === 'installment') {
          const purchaseMonth = date.substring(0, 7);
          // Se a compra foi em mês anterior: primeira parcela entra no mês seguinte (modelo cartão BR)
          // Se a compra foi no mesmo mês ou futuro: primeira parcela entra no próprio mês
          startMonth = month > purchaseMonth
            ? ZUtils.nextMonth(purchaseMonth)
            : purchaseMonth;

          const [sy, sm] = startMonth.split('-').map(Number);
          const [my, mm] = month.split('-').map(Number);
          firstInstallNum = Math.max(1, (my - sy) * 12 + (mm - sm) + 1);
        }

        const txDesc = mode === 'installment' ? `${desc} ${firstInstallNum}/${installments}` : desc;
        const newTx = { id: ZUtils.generateId(), date, description: txDesc, amount, type, category: selectedCat, account, notes };
        await ZDB.addTransaction(month, newTx);
        if (!ZApp.state.data.months[month]) ZApp.state.data.months[month] = { transactions: [], budget: { incomes: [], expenses: [] } };
        ZApp.state.data.months[month].transactions.unshift(newTx);

        if (mode === 'recurring' || mode === 'installment') {
          const dayNum = Math.min(parseInt(date.split('-')[2]) || 1, 28);
          const isFinished = mode === 'installment' && firstInstallNum >= installments;
          const template = {
            description: desc,
            amount, type,
            category: selectedCat,
            account,
            day_of_month: dayNum,
            kind: mode === 'recurring' ? 'recurring' : 'installment',
            total_installments: installments,
            start_month: startMonth,
            last_created_month: month,
            is_active: !isFinished
          };
          const tmplId = await ZDB.addRecurringTemplate(template);
          const newTmpl = { id: tmplId, ...template };
          ZApp.state.data.recurringTemplates = [...(ZApp.state.data.recurringTemplates || []), newTmpl];
        }
      }
      close();
      ZApp.render();
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = editId ? 'Salvar' : 'Lançar'; }
    }
  }

  async function deleteTx(id) {
    if (!confirm('Excluir esta transação?')) return;

    const month = ZApp.state.month;
    const tx = (ZApp.state.data.months[month]?.transactions || []).find(t => t.id === id);

    // Verificar se existe um template recorrente associado
    const baseDesc = tx?.description.replace(/ \d+\/\d+$/, '').trim();
    const matchingTemplate = (ZApp.state.data.recurringTemplates || []).find(t =>
      t.is_active && t.description === baseDesc && t.type === tx?.type
    );

    let deleteTemplate = false;
    if (matchingTemplate) {
      const kindLabel = matchingTemplate.kind === 'recurring' ? 'recorrente' : 'parcelamento';
      deleteTemplate = confirm(
        `Esta transação faz parte de um ${kindLabel} ativo.\nDeseja cancelar também os próximos lançamentos automáticos de "${matchingTemplate.description}"?`
      );
    }

    try {
      await ZDB.deleteTransaction(id);
      if (ZApp.state.data.months[month]) {
        ZApp.state.data.months[month].transactions = ZApp.state.data.months[month].transactions.filter(t => t.id !== id);
      }

      if (deleteTemplate && matchingTemplate) {
        await ZDB.deleteRecurringTemplate(matchingTemplate.id);
        ZApp.state.data.recurringTemplates = (ZApp.state.data.recurringTemplates || []).filter(t => t.id !== matchingTemplate.id);
      }

      close();
      ZApp.render();
    } catch(e) {
      alert(e.message);
    }
  }

  /* ================================================
     FORMULÁRIO: Adicionar Item de Orçamento
     ================================================ */
  function renderAddBudgetItem(params) {
    const { type, month } = params;
    const isIncome = type === 'incomes';
    const cats = ZApp.state.data.categories;
    const catList = isIncome ? cats.incomes : cats.expenses;

    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>${isIncome ? '+ Receita Prevista' : '+ Despesa Prevista'}</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome / Descrição</label>
          <input type="text" class="form-input" id="bi-name" placeholder="${isIncome ? 'Ex: Salário, Freelance...' : 'Ex: Aluguel, Supermercado...'}">
        </div>
        <div class="form-group">
          <label class="form-label">Valor Previsto (R$)</label>
          <input type="number" class="form-input large" id="bi-amount" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <div class="category-picker">
            ${catList.map(cat => {
              const cfg = ZUtils.getCatConfig(cat);
              return `<div class="cat-chip" onclick="ZModals.selectCat(this, '${cat}')" data-cat="${cat}">
                <span>${cfg.emoji}</span> ${cat}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveBudgetItem('${type}', '${month}')">Adicionar</button>
      </div>
    `;
  }

  async function saveBudgetItem(type, month) {
    const name = document.getElementById('bi-name').value.trim();
    const amount = parseFloat(document.getElementById('bi-amount').value);
    const cat = document.querySelector('.cat-chip.selected')?.dataset?.cat || '';

    if (!name) { alert('Informe o nome'); return; }
    if (!amount || amount <= 0) { alert('Informe o valor'); return; }
    if (!cat) { alert('Selecione uma categoria'); return; }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const item = { id: ZUtils.generateId(), name, category: cat, amount };
    try {
      await ZDB.addBudgetItem(month, type, item);
      if (!ZApp.state.data.months[month]) ZApp.state.data.months[month] = { transactions: [], budget: { incomes: [], expenses: [] } };
      ZApp.state.data.months[month].budget[type].push(item);
      close();
      ZApp.render();
      setTimeout(() => {
        const el = document.getElementById(`section-${type}`);
        const arrow = document.getElementById(`arrow-${type}`);
        if (el) el.classList.add('open');
        if (arrow) arrow.classList.add('open');
      }, 50);
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Adicionar'; }
    }
  }

  /* ================================================
     FORMULÁRIO: Adicionar Bem/Ativo
     ================================================ */
  function renderAddAsset(params) {
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>+ Novo Bem ou Ativo</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome do Bem</label>
          <input type="text" class="form-input" id="asset-name" placeholder="Ex: Apartamento, Carro, Ações...">
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-input" id="asset-cat">
            <option value="Imóvel">🏠 Imóvel</option>
            <option value="Veículo">🚗 Veículo</option>
            <option value="Investimento">💰 Investimento</option>
            <option value="Empresa">🏢 Empresa</option>
            <option value="Terreno">🌱 Terreno</option>
            <option value="Outros">📦 Outros</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor de Compra (R$)</label>
            <input type="number" class="form-input" id="asset-purchase" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
          <div class="form-group">
            <label class="form-label">Valor Atual (R$)</label>
            <input type="number" class="form-input" id="asset-current" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Data de Compra</label>
          <input type="date" class="form-input" id="asset-date">
        </div>
        <div class="form-group">
          <label class="form-label">Observações (opcional)</label>
          <input type="text" class="form-input" id="asset-notes" placeholder="Anotações...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveAsset()">Salvar</button>
      </div>
    `;
  }

  async function saveAsset() {
    const name = document.getElementById('asset-name').value.trim();
    const cat = document.getElementById('asset-cat').value;
    const purchase = parseFloat(document.getElementById('asset-purchase').value) || 0;
    const current = parseFloat(document.getElementById('asset-current').value) || 0;
    const date = document.getElementById('asset-date').value;
    const notes = document.getElementById('asset-notes').value.trim();

    if (!name) { alert('Informe o nome do bem'); return; }
    if (current <= 0) { alert('Informe o valor atual'); return; }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const asset = { id: ZUtils.generateId(), name, category: cat, purchaseDate: date, purchaseValue: purchase, currentValue: current, notes };
    try {
      await ZDB.addAsset(asset);
      ZApp.state.data.assets.push(asset);
      close();
      ZApp.render();
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  }

  /* ================================================
     FORMULÁRIO: Adicionar Dívida
     ================================================ */
  function renderAddDebt(params) {
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>+ Nova Dívida</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome da Dívida</label>
          <input type="text" class="form-input" id="debt-name" placeholder="Ex: Financiamento Casa, Empréstimo...">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-input" id="debt-type">
            <option>Financiamento Imobiliário</option>
            <option>Financiamento de Veículo</option>
            <option>Empréstimo Pessoal</option>
            <option>Empréstimo Consignado</option>
            <option>Cartão de Crédito</option>
            <option>Consórcio</option>
            <option>Outro</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Saldo Devedor (R$)</label>
            <input type="number" class="form-input" id="debt-balance" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
          <div class="form-group">
            <label class="form-label">Valor da Parcela (R$)</label>
            <input type="number" class="form-input" id="debt-installment" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Parcelas Restantes</label>
            <input type="number" class="form-input" id="debt-remaining" placeholder="0" min="0" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">Total de Parcelas</label>
            <input type="number" class="form-input" id="debt-total" placeholder="0" min="0" inputmode="numeric">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data de Início</label>
            <input type="date" class="form-input" id="debt-start">
          </div>
          <div class="form-group">
            <label class="form-label">Data de Término</label>
            <input type="date" class="form-input" id="debt-end">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveDebt()">Salvar</button>
      </div>
    `;
  }

  async function saveDebt() {
    const name = document.getElementById('debt-name').value.trim();
    const type = document.getElementById('debt-type').value;
    const balance = parseFloat(document.getElementById('debt-balance').value) || 0;
    const installment = parseFloat(document.getElementById('debt-installment').value) || 0;
    const remaining = parseInt(document.getElementById('debt-remaining').value) || 0;
    const total = parseInt(document.getElementById('debt-total').value) || 0;
    const start = document.getElementById('debt-start').value;
    const end = document.getElementById('debt-end').value;

    if (!name) { alert('Informe o nome da dívida'); return; }
    if (balance <= 0) { alert('Informe o saldo devedor'); return; }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const debt = {
      id: ZUtils.generateId(), name, type,
      totalValue: total * installment,
      remainingBalance: balance,
      totalInstallments: total,
      remainingInstallments: remaining,
      installmentValue: installment,
      startDate: start, endDate: end
    };
    try {
      await ZDB.addDebt(debt);
      ZApp.state.data.debts.push(debt);
      close();
      ZApp.render();
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  }

  /* ================================================
     FORMULÁRIO: Adicionar Item Futuro
     ================================================ */
  function renderAddFutureItem(params) {
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>+ Item de Fluxo Futuro</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <div class="segmented" id="fi-type-sel">
            <button class="seg-btn expense active" onclick="document.querySelectorAll('#fi-type-sel .seg-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">↓ A Pagar</button>
            <button class="seg-btn income" onclick="document.querySelectorAll('#fi-type-sel .seg-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">↑ A Receber</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input type="text" class="form-input" id="fi-desc" placeholder="Ex: Parcela TV, Empréstimo ao João...">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nº de Parcelas</label>
            <input type="number" class="form-input" id="fi-installments" placeholder="12" min="1" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">Valor da Parcela (R$)</label>
            <input type="number" class="form-input" id="fi-value" placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Início</label>
            <input type="date" class="form-input" id="fi-start">
          </div>
          <div class="form-group">
            <label class="form-label">Término</label>
            <input type="date" class="form-input" id="fi-end">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveFutureItem()">Salvar</button>
      </div>
    `;
  }

  async function saveFutureItem() {
    const type = document.querySelector('#fi-type-sel .seg-btn.active')?.classList.contains('income') ? 'income' : 'expense';
    const desc = document.getElementById('fi-desc').value.trim();
    const installments = parseInt(document.getElementById('fi-installments').value) || 0;
    const value = parseFloat(document.getElementById('fi-value').value) || 0;
    const start = document.getElementById('fi-start').value;
    const end = document.getElementById('fi-end').value;

    if (!desc) { alert('Informe a descrição'); return; }
    if (installments <= 0) { alert('Informe o número de parcelas'); return; }
    if (value <= 0) { alert('Informe o valor da parcela'); return; }
    if (!start) { alert('Informe a data de início'); return; }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const item = {
      id: ZUtils.generateId(), description: desc, type,
      totalValue: installments * value,
      totalInstallments: installments,
      installmentValue: value,
      startDate: start,
      endDate: end || start,
      status: 'active'
    };
    try {
      await ZDB.addFutureItem(item);
      ZApp.state.data.futureItems.push(item);
      close();
      ZApp.render();
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  }

  /* ================================================
     IMPORTAR EXTRATO
     ================================================ */
  let _importedTxs = [];

  // Calcula o mês de vencimento da fatura para uma data de compra
  function _cardBillMonth(dateStr, closingDay) {
    const d = new Date((ZImport.parseDate(dateStr) || dateStr) + 'T12:00:00');
    if (isNaN(d)) return dateStr.substring(0, 7);
    let year = d.getFullYear();
    let month = d.getMonth(); // 0-indexed
    if (d.getDate() > closingDay) { month++; if (month > 11) { month = 0; year++; } }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  function renderImport(params) {
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>📂 Importar Extrato</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div id="import-step-1">
          <div class="import-dropzone" id="import-dropzone"
            ondragover="event.preventDefault(); this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="event.preventDefault(); this.classList.remove('drag-over'); ZModals.handleImportFile({target:{files:event.dataTransfer.files}})">
            <div style="font-size:44px; margin-bottom:12px">📁</div>
            <div style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:4px">Arraste um arquivo aqui</div>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:16px">ou clique para selecionar</div>
            <input type="file" id="import-file-input" accept=".csv,.ofx,.txt,.pdf,.jpg,.jpeg,.png,.webp" style="display:none" onchange="ZModals.handleImportFile(event)">
            <button class="btn btn-primary" onclick="document.getElementById('import-file-input').click()">
              Selecionar Arquivo
            </button>
            <div style="margin-top:14px; font-size:11px; color:var(--text-muted); line-height:1.8">
              <span style="color:var(--success); font-weight:600">Grátis:</span> CSV · OFX<br>
              <span style="color:var(--purple); font-weight:600">✨ Com IA:</span> PDF · JPG · PNG (fatura de qualquer cartão)
            </div>
          </div>
        </div>

        <div id="import-step-2" style="display:none">
          <div id="import-summary"></div>
          <div id="import-preview-table" style="max-height:340px; overflow-y:auto; margin-top:12px"></div>
        </div>

        <div id="import-step-3" style="display:none; text-align:center; padding:40px 20px">
          <div style="font-size:36px; margin-bottom:12px">⏳</div>
          <div style="font-size:14px; font-weight:600; color:var(--text)" id="import-loading-msg">Importando...</div>
        </div>
      </div>

      <div class="modal-footer" id="import-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
      </div>
    `;
  }

  function _isAiFile(fileName) {
    const ext = (fileName || '').toLowerCase().split('.').pop();
    return ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);
  }

  function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function _showImportLoading(msg) {
    document.getElementById('import-step-1').style.display = 'none';
    document.getElementById('import-step-2').style.display = 'none';
    document.getElementById('import-step-3').style.display = 'block';
    document.getElementById('import-loading-msg').textContent = msg || 'Processando...';
    document.getElementById('import-footer').innerHTML = '';
  }

  function _showImportPreview(transactions) {
    _importedTxs = transactions;
    document.getElementById('import-step-3').style.display = 'none';
    document.getElementById('import-step-2').style.display = 'block';

    const detectedMonth = ZImport.detectMonth(transactions);
    const hasKey = ZAI.hasKey();
    const cards = ZApp.state.data.creditCards || [];

    const cardOptions = [
      `<option value="">Nenhum (sem cartão)</option>`,
      ...cards.map(c => `<option value="${c.name}">${c.name}</option>`)
    ].join('');

    document.getElementById('import-summary').innerHTML = `
      <div style="background:var(--primary-light); border:1px solid var(--primary-mid); border-radius:var(--radius-sm); padding:12px 16px; margin-bottom:8px">
        <div style="font-size:14px; font-weight:700; color:var(--primary)">
          ✅ ${transactions.length} transações detectadas
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px">
          Período: ${ZUtils.getMonthName(detectedMonth)}
          · Receitas: ${transactions.filter(t=>t.type==='income').length}
          · Despesas: ${transactions.filter(t=>t.type==='expense').length}
        </div>
      </div>
      ${cards.length > 0 ? `
      <div style="margin-bottom:8px">
        <label style="font-size:12px; color:var(--text-muted); font-weight:600; display:block; margin-bottom:4px">Vincular ao cartão</label>
        <select id="import-card-select" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg); color:var(--text); font-size:13px">
          ${cardOptions}
        </select>
      </div>` : ''}
    `;

    renderImportPreviewTable(transactions);

    document.getElementById('import-footer').innerHTML = `
      <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
      ${hasKey ? `<button class="btn btn-secondary" style="background:var(--purple-light); color:var(--purple); border-color:var(--purple)" onclick="ZModals.aiCategorizeImport()">✨ Categorizar com IA</button>` : ''}
      <button class="btn btn-primary" style="flex:2" onclick="ZModals.confirmImport()">
        Importar ${transactions.length} lançamentos
      </button>
    `;
  }

  function _showImportError(msg) {
    document.getElementById('import-step-3').style.display = 'none';
    document.getElementById('import-step-1').style.display = 'block';
    document.getElementById('import-footer').innerHTML = `<button class="btn btn-secondary" onclick="ZModals.close()">Fechar</button>`;
    alert(msg);
  }

  async function handleImportFile(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    // PDF ou imagem → usa IA
    if (_isAiFile(file.name)) {
      if (!ZAI.hasKey()) {
        alert('Para importar PDF e imagens, configure sua chave Claude em Configurações → Inteligência Artificial.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo permitido: 10MB.');
        return;
      }

      _showImportLoading('Claude está lendo a fatura... isso pode levar alguns segundos.');

      try {
        const base64   = await _fileToBase64(file);
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        const cats     = ZApp.state.data.categories;
        const transactions = await ZAI.extractFromFile(base64, mimeType, cats);

        if (transactions.length === 0) {
          _showImportError('Nenhuma transação encontrada. Verifique se o arquivo está legível e tente novamente.');
          return;
        }
        _showImportPreview(transactions);
      } catch(e) {
        _showImportError('Erro: ' + e.message);
      }
      return;
    }

    // CSV ou OFX → parser local (grátis)
    const text = await file.text();
    const transactions = ZImport.parse(text, file.name);

    if (transactions.length === 0) {
      alert('Nenhuma transação encontrada. Verifique o formato do arquivo.');
      return;
    }

    _showImportPreview(transactions);
  }

  function renderImportPreviewTable(transactions) {
    const rows = transactions.slice(0, 100).map((t, i) => {
      const cfg = ZUtils.getCatConfig(t.category || 'Outros');
      return `
        <tr>
          <td style="font-size:12px; color:var(--text-muted)">${t.date}</td>
          <td style="font-size:13px">${t.description}</td>
          <td style="font-size:12px">
            <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; background:${cfg.bg}; color:${cfg.color}; font-size:11px; font-weight:600">
              ${cfg.emoji} ${t.category || 'Sem categoria'}
            </span>
          </td>
          <td style="text-align:right; font-weight:700; color:${t.type==='income' ? 'var(--success)' : 'var(--danger)'}; font-size:13px">
            ${t.type==='income' ? '+' : '-'} ${ZUtils.formatCurrencyShort(t.amount)}
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('import-preview-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${transactions.length > 100 ? `<div style="text-align:center; font-size:12px; color:var(--text-muted); padding:8px">... e mais ${transactions.length - 100} transações</div>` : ''}
    `;
  }

  async function aiCategorizeImport() {
    const footer = document.getElementById('import-footer');
    const aiBtn = footer.querySelector('button:nth-child(2)');
    if (aiBtn) { aiBtn.disabled = true; aiBtn.textContent = '✨ Categorizando...'; }

    try {
      const cats = ZApp.state.data.categories;
      const categories = await ZAI.categorize(_importedTxs, cats);
      _importedTxs = _importedTxs.map((t, i) => ({ ...t, category: categories[i] || t.category || 'Outros' }));
      renderImportPreviewTable(_importedTxs);
      if (aiBtn) { aiBtn.disabled = false; aiBtn.textContent = '✅ Categorizado!'; }
    } catch(e) {
      alert('Erro na IA: ' + e.message);
      if (aiBtn) { aiBtn.disabled = false; aiBtn.textContent = '✨ Categorizar com IA'; }
    }
  }

  async function confirmImport() {
    if (_importedTxs.length === 0) return;

    document.getElementById('import-step-2').style.display = 'none';
    document.getElementById('import-step-3').style.display = 'block';
    document.getElementById('import-footer').innerHTML = '';

    const month = ZApp.state.month;
    const selectedCard = document.getElementById('import-card-select')?.value || '';
    const cardData = selectedCard
      ? (ZApp.state.data.creditCards || []).find(c => c.name === selectedCard)
      : null;
    let saved = 0;
    let errors = 0;

    const msgEl = document.getElementById('import-loading-msg');

    for (const t of _importedTxs) {
      try {
        if (msgEl) msgEl.textContent = `Importando ${saved + 1} de ${_importedTxs.length}...`;

        // Normaliza a data para YYYY-MM-DD
        const txDate = ZImport.parseDate(t.date || '') || (month + '-01');

        // Se tem cartão, usa o mês de vencimento da fatura (não o mês da compra)
        let txMonth;
        if (cardData) {
          txMonth = _cardBillMonth(txDate, cardData.closing_day);
        } else {
          txMonth = txDate.substring(0, 7) || month;
        }

        const newTx = {
          id: ZUtils.generateId(),
          date: txDate,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category || 'Outros',
          account: selectedCard,
          notes: 'Importado'
        };
        await ZDB.addTransaction(txMonth, newTx);

        if (!ZApp.state.data.months[txMonth]) {
          ZApp.state.data.months[txMonth] = { transactions: [], budget: { incomes: [], expenses: [] } };
        }
        ZApp.state.data.months[txMonth].transactions.push(newTx);
        saved++;
      } catch(e) {
        console.error('Erro ao importar transação:', e.message, t);
        errors++;
      }
    }

    // Navega para o mês de vencimento da fatura (ou mês detectado)
    const billMonth = cardData
      ? _cardBillMonth(_importedTxs.find(t => t.date)?.date || (month + '-01'), cardData.closing_day)
      : ZImport.detectMonth(_importedTxs);
    close();
    ZApp.state.month = billMonth;
    ZApp.navigate('transactions');
    setTimeout(() => {
      if (saved === 0 && errors > 0) {
        alert(`❌ Nenhum lançamento foi importado.\n${errors} transações falharam — verifique o console (F12) para detalhes.`);
      } else {
        alert(`✅ ${saved} lançamentos importados com sucesso!${errors > 0 ? `\n⚠️ ${errors} falharam.` : ''}`);
      }
    }, 300);
  }

  /* ================================================
     MODAL: NOVA META
     ================================================ */
  function renderAddGoal(params) {
    const emojis = ZGoals.EMOJIS;
    const colors = ZGoals.COLORS;
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>🎯 Nova Meta</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">Ícone</label>
          <div style="display:flex; flex-wrap:wrap; gap:6px" id="goal-emoji-picker">
            ${emojis.map((e, i) => `
              <button class="emoji-opt ${i === 0 ? 'active' : ''}" onclick="ZModals.selectGoalEmoji(this,'${e}')">${e}</button>
            `).join('')}
          </div>
          <input type="hidden" id="goal-emoji" value="${emojis[0]}">
        </div>

        <div class="form-group">
          <label class="form-label">Nome da meta</label>
          <input type="text" class="form-input" id="goal-name"
            placeholder="Ex: Viagem para Europa, Casa própria...">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor objetivo (R$)</label>
            <input type="number" class="form-input" id="goal-target"
              placeholder="0,00" min="0" step="0.01" inputmode="decimal">
          </div>
          <div class="form-group">
            <label class="form-label">Já guardado (R$)</label>
            <input type="number" class="form-input" id="goal-saved"
              placeholder="0,00" min="0" step="0.01" inputmode="decimal" value="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Prazo (opcional)</label>
          <input type="date" class="form-input" id="goal-deadline">
        </div>

        <div class="form-group">
          <label class="form-label">Cor</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap" id="goal-color-picker">
            ${colors.map((c, i) => `
              <button onclick="ZModals.selectGoalColor(this,'${c}')"
                style="width:30px; height:30px; border-radius:50%; background:${c}; border:${i === 0 ? '3px solid var(--text)' : '2px solid transparent'}; cursor:pointer; transition:border 0.15s"></button>
            `).join('')}
          </div>
          <input type="hidden" id="goal-color" value="${colors[0]}">
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveGoal()">Salvar meta</button>
      </div>
    `;
  }

  function selectGoalEmoji(btn, emoji) {
    document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const el = document.getElementById('goal-emoji');
    if (el) el.value = emoji;
  }

  function selectGoalColor(btn, color) {
    document.querySelectorAll('#goal-color-picker button').forEach(b => b.style.border = '2px solid transparent');
    btn.style.border = '3px solid var(--text)';
    const el = document.getElementById('goal-color');
    if (el) el.value = color;
  }

  async function saveGoal() {
    const name   = document.getElementById('goal-name')?.value?.trim();
    const target = parseFloat(document.getElementById('goal-target')?.value);
    const saved  = parseFloat(document.getElementById('goal-saved')?.value) || 0;
    const deadline = document.getElementById('goal-deadline')?.value || null;
    const emoji  = document.getElementById('goal-emoji')?.value || '🎯';
    const color  = document.getElementById('goal-color')?.value || '#3B82F6';

    if (!name)                   { alert('Digite o nome da meta.'); return; }
    if (!target || target <= 0)  { alert('Digite o valor objetivo.'); return; }

    const goal = { name, target, saved, deadline, emoji, color };
    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
      const newId = await ZDB.addGoal(goal);
      goal.id = newId;
      ZApp.state.data.goals = [...(ZApp.state.data.goals || []), goal];
      close();
      ZApp.navigate('goals');
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar meta'; }
    }
  }

  /* ================================================
     MODAL: CONTRIBUIR PARA META
     ================================================ */
  function renderContributeGoal(params) {
    const goal = (ZApp.state.data.goals || []).find(g => g.id === params.goalId);
    if (!goal) return '';
    const remaining = Math.max(0, goal.target - goal.saved);
    const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));

    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>${goal.emoji} ${goal.name}</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">

        <div style="text-align:center; padding:16px; background:var(--bg); border-radius:var(--radius-sm); margin-bottom:20px">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px">Progresso atual: ${pct}%</div>
          <div style="background:var(--border); border-radius:4px; height:8px; overflow:hidden; margin-bottom:12px">
            <div style="height:100%; width:${pct}%; background:${goal.color}; border-radius:4px; transition:width 0.3s"></div>
          </div>
          <div style="font-size:13px; color:var(--text-muted)">Faltam</div>
          <div style="font-size:28px; font-weight:900; color:${goal.color}">${ZUtils.formatCurrency(remaining)}</div>
          <div style="font-size:12px; color:var(--text-muted)">para atingir ${ZUtils.formatCurrency(goal.target)}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Quanto vai guardar agora? (R$)</label>
          <input type="number" class="form-input large" id="contribute-amount"
            placeholder="0,00" min="0" step="0.01" inputmode="decimal"
            onkeydown="if(event.key==='Enter') ZModals.saveContribution()">
        </div>

        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:4px">
          ${[50, 100, 200, 500].map(v => `
            <button onclick="document.getElementById('contribute-amount').value='${v}'"
              style="padding:8px 4px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; font-weight:600; cursor:pointer; color:var(--text); transition:all 0.15s"
              onmouseover="this.style.borderColor='${goal.color}'; this.style.color='${goal.color}'"
              onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text)'">
              R$${v}
            </button>
          `).join('')}
        </div>

        <input type="hidden" id="contribute-goal-id" value="${goal.id}">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ZModals.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="ZModals.saveContribution()">Guardar</button>
      </div>
    `;
  }

  async function saveContribution() {
    const goalId = document.getElementById('contribute-goal-id')?.value;
    const amount = parseFloat(document.getElementById('contribute-amount')?.value);

    if (!amount || amount <= 0) { alert('Digite um valor válido.'); return; }

    const goal = (ZApp.state.data.goals || []).find(g => g.id === goalId);
    if (!goal) return;

    const newSaved = goal.saved + amount;
    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
      await ZDB.updateGoal(goalId, { saved: newSaved });
      goal.saved = newSaved;
      close();
      ZApp.navigate('goals');
    } catch(e) {
      alert(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    }
  }

  /* ================================================
     MODAL: ONBOARDING (boas-vindas)
     ================================================ */
  function renderOnboarding(params) {
    const step = params.step || 1;
    const steps = [
      {
        emoji: '👋',
        title: 'Bem-vindo ao ZAFINN!',
        desc: 'Sua ferramenta completa de organização financeira pessoal.',
        items: ['💵 Configure seu orçamento mensal', '💳 Lance receitas e despesas', '📊 Acompanhe no dashboard', '🎯 Defina metas financeiras', '✨ Use a IA para diagnósticos']
      },
      {
        emoji: '📋',
        title: '3 passos para começar',
        desc: 'É simples e rápido de configurar:',
        items: [
          '1️⃣  Vá em <strong>Orçamento</strong> e adicione suas receitas e despesas previstas',
          '2️⃣  Use o botão <strong>+</strong> para lançar transações do dia a dia',
          '3️⃣  Acompanhe tudo no <strong>Dashboard</strong>'
        ]
      },
      {
        emoji: '🚀',
        title: 'Tudo pronto!',
        desc: 'Comece agora mesmo. Quanto antes você registrar, mais preciso será o diagnóstico.',
        items: []
      }
    ];

    const s = steps[step - 1];
    const isLast = step === steps.length;
    const isFirst = step === 1;

    return `
      <div class="modal-handle"></div>
      <div class="modal-body" style="text-align:center; padding:32px 24px 24px">

        <div style="display:flex; gap:6px; justify-content:center; margin-bottom:28px">
          ${steps.map((_, i) => `
            <div style="height:6px; border-radius:3px; background:${i + 1 === step ? 'var(--primary)' : 'var(--border)'}; width:${i + 1 === step ? '24px' : '8px'}; transition:all 0.3s"></div>
          `).join('')}
        </div>

        <div style="font-size:52px; margin-bottom:16px">${s.emoji}</div>
        <h2 style="font-size:20px; font-weight:800; margin-bottom:10px; color:var(--text)">${s.title}</h2>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height:1.6">${s.desc}</p>

        ${s.items.length > 0 ? `
          <div style="background:var(--bg); border-radius:var(--radius-sm); padding:16px; margin-bottom:24px; text-align:left">
            ${s.items.map(item => `
              <div style="padding:6px 0; font-size:13px; color:var(--text); line-height:1.5">${item}</div>
            `).join('')}
          </div>
        ` : `<div style="height:16px"></div>`}

        <div style="display:flex; gap:10px; justify-content:center">
          ${!isFirst ? `
            <button onclick="ZApp.openModal('onboarding', {step:${step - 1}})"
              style="padding:11px 20px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:14px; font-weight:600; cursor:pointer; color:var(--text)">
              ← Anterior
            </button>
          ` : ''}
          ${!isLast ? `
            <button onclick="ZApp.openModal('onboarding', {step:${step + 1}})"
              style="padding:11px 28px; background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); font-size:14px; font-weight:700; cursor:pointer">
              Próximo →
            </button>
          ` : `
            <button onclick="ZModals.finishOnboarding()"
              style="padding:11px 28px; background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); font-size:14px; font-weight:700; cursor:pointer">
              🚀 Começar!
            </button>
          `}
        </div>

      </div>
    `;
  }

  function finishOnboarding() {
    localStorage.setItem('zafinn_onboarded', '1');
    close();
  }

  /* ================================================
     ANÁLISE COM IA
     ================================================ */
  function renderAiAnalysis(params) {
    const { analysis, loading, error } = params || {};
    return `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>✨ Diagnóstico com IA</h2>
        <button class="modal-close" onclick="ZModals.close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        ${loading ? `
          <div style="text-align:center; padding:60px 20px">
            <div style="font-size:48px; margin-bottom:16px">🤖</div>
            <div style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:8px">Analisando suas finanças...</div>
            <div style="font-size:13px; color:var(--text-muted)">O Claude está revisando seus dados. Aguarde um momento.</div>
          </div>
        ` : error ? `
          <div style="background:var(--danger-light); border:1px solid var(--danger-mid); border-radius:var(--radius-sm); padding:16px; color:var(--danger)">
            <strong>Erro:</strong> ${error}
          </div>
        ` : `
          <div class="ai-analysis-content">${formatAiResponse(analysis || '')}</div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="ZModals.close()">Fechar</button>
      </div>
    `;
  }

  function formatAiResponse(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:16px 0 8px; font-size:14px; color:var(--primary)">$1</h4>')
      .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding:6px 0; display:flex; gap:8px"><span style="font-weight:700; color:var(--primary); flex-shrink:0">$1.</span><span>$2</span></div>')
      .replace(/^[-•]\s+(.+)$/gm, '<div style="padding:4px 0; display:flex; gap:8px"><span style="color:var(--primary); flex-shrink:0">•</span><span>$1</span></div>')
      .replace(/\n\n/g, '<div style="height:12px"></div>')
      .replace(/\n/g, '<br>');
  }

  /* ================================================
     CARTÃO DE CRÉDITO
     ================================================ */
  function renderAddCard() {
    const colors = ZCards.CARD_COLORS;
    return `
      <div class="modal-header">
        <h3 class="modal-title">Novo Cartão de Crédito</h3>
        <button class="modal-close" onclick="ZModals.close()">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">NOME DO CARTÃO</label>
          <input id="card-name" type="text" class="form-input" placeholder="Ex: Nubank, Itaú Visa, Inter...">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
          <div class="form-group">
            <label class="form-label">DIA DE FECHAMENTO</label>
            <input id="card-closing" type="number" class="form-input" placeholder="Ex: 3" min="1" max="28">
          </div>
          <div class="form-group">
            <label class="form-label">DIA DE VENCIMENTO</label>
            <input id="card-due" type="number" class="form-input" placeholder="Ex: 10" min="1" max="28">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">LIMITE DO CARTÃO (OPCIONAL)</label>
          <input id="card-limit" type="number" class="form-input" placeholder="Ex: 5000.00" step="0.01" min="0">
        </div>

        <div class="form-group">
          <label class="form-label">COR DO CARTÃO</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px">
            ${colors.map((c, i) => `
              <div onclick="ZModals.selectCardColor('${c}')" id="card-color-${i}"
                style="width:36px; height:36px; border-radius:10px; background:${c}; cursor:pointer;
                border: 3px solid ${i === 0 ? '#5DD62C' : 'transparent'}; transition:border-color .15s">
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="card-color-val" value="${colors[0]}">
        </div>

        <div id="card-error" class="form-error" style="display:none"></div>

        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="ZModals.close()">Cancelar</button>
          <button class="btn btn-primary" onclick="ZModals.saveCard()">Salvar cartão</button>
        </div>
      </div>
    `;
  }

  function selectCardColor(color) {
    document.getElementById('card-color-val').value = color;
    ZCards.CARD_COLORS.forEach((c, i) => {
      const el = document.getElementById(`card-color-${i}`);
      if (el) el.style.borderColor = c === color ? '#5DD62C' : 'transparent';
    });
  }

  async function saveCard() {
    const name    = document.getElementById('card-name')?.value?.trim();
    const closing = parseInt(document.getElementById('card-closing')?.value);
    const due     = parseInt(document.getElementById('card-due')?.value);
    const limit   = parseFloat(document.getElementById('card-limit')?.value) || null;
    const color   = document.getElementById('card-color-val')?.value || '#0F0F0F';

    const errEl = document.getElementById('card-error');
    if (!name) { errEl.textContent = 'Informe o nome do cartão'; errEl.style.display='block'; return; }
    if (!closing || closing < 1 || closing > 28) { errEl.textContent = 'Dia de fechamento inválido (1-28)'; errEl.style.display='block'; return; }
    if (!due || due < 1 || due > 28) { errEl.textContent = 'Dia de vencimento inválido (1-28)'; errEl.style.display='block'; return; }
    errEl.style.display = 'none';

    try {
      const card = { name, closing_day: closing, due_day: due, limit_amount: limit, color };
      const newId = await ZDB.addCreditCard(card);
      card.id = newId;
      ZApp.state.data.creditCards = [...(ZApp.state.data.creditCards || []), card];
      ZApp.closeModal();
      ZApp.navigate('cards');
    } catch(e) {
      errEl.textContent = e.message; errEl.style.display = 'block';
    }
  }

  return {
    render, close,
    setTxType, setTxMode, selectCat,
    selectTxAccount, showOtherAccount,
    saveTx, deleteTx,
    saveBudgetItem,
    saveAsset,
    saveDebt,
    saveFutureItem,
    handleImportFile,
    aiCategorizeImport,
    confirmImport,
    formatAiResponse,
    selectGoalEmoji, selectGoalColor,
    saveGoal, saveContribution,
    finishOnboarding,
    selectCardColor, saveCard
  };

})();
