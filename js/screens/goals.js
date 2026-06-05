/* ================================================
   ZAFINN - Tela de Metas Financeiras
   Desktop: grid de cards
   Mobile: cards empilhados
   ================================================ */

const ZGoals = (function() {

  const EMOJIS = ['🎯','✈️','🏠','🚗','📱','💍','🎓','🏖️','💰','🎁','🏋️','📚','💻','🎮','🎵'];
  const COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#EF4444','#06B6D4','#F97316'];

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    const goals = state.data.goals || [];
    const total = goals.length;
    const complete = goals.filter(g => g.saved >= g.target).length;

    return `
      <div class="screen-content">

        ${total > 0 ? `
        <div class="kpi-grid" style="margin-bottom:20px">
          <div class="kpi-card neutral">
            <div class="kpi-icon">🎯</div>
            <div class="kpi-label">Total de Metas</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-sub">${complete} alcançadas</div>
          </div>
          <div class="kpi-card income">
            <div class="kpi-icon">💰</div>
            <div class="kpi-label">Total Guardado</div>
            <div class="kpi-value">${ZUtils.formatCurrencyShort(goals.reduce((s,g) => s + g.saved, 0))}</div>
            <div class="kpi-sub">de ${ZUtils.formatCurrencyShort(goals.reduce((s,g) => s + g.target, 0))} em metas</div>
          </div>
          <div class="kpi-card balance">
            <div class="kpi-icon">📈</div>
            <div class="kpi-label">Progresso Geral</div>
            <div class="kpi-value">
              ${goals.reduce((s,g) => s + g.target, 0) > 0
                ? Math.round(goals.reduce((s,g) => s + g.saved, 0) / goals.reduce((s,g) => s + g.target, 0) * 100) + '%'
                : '—'}
            </div>
            <div class="kpi-sub">média entre todas as metas</div>
          </div>
          <div class="kpi-card neutral">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-label">Em Andamento</div>
            <div class="kpi-value">${total - complete}</div>
            <div class="kpi-sub">metas em progresso</div>
          </div>
        </div>
        ` : ''}

        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text)">Metas Financeiras</h2>
            <div style="font-size:13px; color:var(--text-muted)">Acompanhe seus objetivos e celebre cada conquista</div>
          </div>
          <button onclick="ZApp.openModal('addGoal', {})" class="header-action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Meta
          </button>
        </div>

        ${goals.length === 0 ? renderEmpty() : `
          <div class="goals-grid">
            ${goals.map(g => renderGoalCard(g)).join('')}
          </div>
        `}

      </div>
    `;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    const goals = state.data.goals || [];

    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Planejamento</div>
          <h1>Metas</h1>
        </div>
        <button onclick="ZApp.openModal('addGoal', {})"
          style="background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); padding:8px 14px; font-size:12px; font-weight:700; cursor:pointer">
          + Nova
        </button>
      </div>

      <div class="screen-content">
        <div class="spacer-sm"></div>

        ${goals.length === 0 ? renderEmpty() : `
          <div style="padding:0 16px; display:flex; flex-direction:column; gap:12px">
            ${goals.map(g => renderGoalCard(g)).join('')}
          </div>
        `}

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  /* ---------- Empty state ---------- */
  function renderEmpty() {
    return `
      <div style="text-align:center; padding:60px 24px; background:var(--card); border-radius:var(--radius-lg); border:2px dashed var(--border)">
        <div style="font-size:52px; margin-bottom:16px">🎯</div>
        <div style="font-size:18px; font-weight:800; margin-bottom:8px">Nenhuma meta ainda</div>
        <div style="font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height:1.6">
          Defina seus objetivos financeiros e acompanhe o progresso.<br>
          Viagem, casa própria, reserva de emergência...
        </div>
        <button onclick="ZApp.openModal('addGoal', {})"
          style="background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer">
          Criar minha primeira meta
        </button>
      </div>
    `;
  }

  /* ---------- Card de meta ---------- */
  function renderGoalCard(goal) {
    const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
    const remaining = Math.max(0, goal.target - goal.saved);
    const isComplete = pct >= 100;

    let deadlineText = '';
    let deadlineClass = '';
    if (goal.deadline) {
      const d = new Date(goal.deadline + 'T00:00:00');
      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) { deadlineText = 'Prazo encerrado'; deadlineClass = 'overdue'; }
      else if (diffDays === 0) { deadlineText = 'Vence hoje'; deadlineClass = 'urgent'; }
      else if (diffDays <= 30) { deadlineText = `${diffDays} dias restantes`; deadlineClass = 'urgent'; }
      else {
        const months = Math.ceil(diffDays / 30);
        deadlineText = `${months} ${months === 1 ? 'mês' : 'meses'} restantes`;
      }
    }

    return `
      <div class="goal-card ${isComplete ? 'complete' : ''}">
        <div class="goal-card-top">
          <div class="goal-emoji-wrap" style="background:${goal.color}18">
            <span class="goal-emoji">${goal.emoji}</span>
          </div>
          <div style="flex:1; min-width:0">
            <div class="goal-name">${goal.name}</div>
            ${deadlineText ? `<div class="goal-deadline ${deadlineClass}">${deadlineText}</div>` : ''}
          </div>
          <div class="goal-pct-badge" style="background:${isComplete ? '#DCFCE7' : goal.color + '18'}; color:${isComplete ? '#16A34A' : goal.color}">
            ${pct}%
          </div>
        </div>

        <div class="goal-progress-track">
          <div class="goal-progress-fill" style="width:${pct}%; background:${isComplete ? 'var(--success)' : goal.color}"></div>
        </div>

        <div class="goal-amounts-row">
          <div>
            <div class="goal-amount-value" style="color:${isComplete ? 'var(--success)' : goal.color}">
              ${ZUtils.formatCurrencyShort(goal.saved)}
            </div>
            <div class="goal-amount-label">guardados</div>
          </div>
          <div style="text-align:right">
            <div class="goal-amount-value">${ZUtils.formatCurrencyShort(goal.target)}</div>
            <div class="goal-amount-label">objetivo</div>
          </div>
        </div>

        ${!isComplete ? `
          <div style="display:flex; gap:8px; margin-top:14px">
            <button onclick="ZApp.openModal('contributeGoal', {goalId:'${goal.id}'})"
              style="flex:1; padding:9px 0; background:${goal.color}18; color:${goal.color}; border:1.5px solid ${goal.color}40; border-radius:var(--radius-sm); font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s"
              onmouseover="this.style.background='${goal.color}30'" onmouseout="this.style.background='${goal.color}18'">
              + Contribuir
            </button>
            <button onclick="ZGoals.deleteGoal('${goal.id}')"
              style="padding:9px 12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer; color:var(--text-muted); transition:all 0.15s"
              onmouseover="this.style.borderColor='var(--danger)'; this.style.color='var(--danger)'"
              onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-muted)'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        ` : `
          <div style="margin-top:14px; padding:10px; background:#DCFCE7; border-radius:var(--radius-sm); text-align:center; font-size:13px; font-weight:700; color:#16A34A">
            🎉 Meta alcançada! Parabéns!
          </div>
          <button onclick="ZGoals.deleteGoal('${goal.id}')"
            style="margin-top:8px; width:100%; padding:6px; background:transparent; border:none; font-size:11px; color:var(--text-muted); cursor:pointer">
            Remover esta meta
          </button>
        `}
      </div>
    `;
  }

  async function deleteGoal(id) {
    if (!confirm('Remover esta meta?')) return;
    try {
      await ZDB.deleteGoal(id);
      ZApp.state.data.goals = (ZApp.state.data.goals || []).filter(g => g.id !== id);
      ZApp.render();
    } catch(e) { alert(e.message); }
  }

  return { render, renderGoalCard, deleteGoal, EMOJIS, COLORS };

})();
