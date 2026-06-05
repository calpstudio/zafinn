/* ================================================
   ZAFINN - Tela de Configurações
   Desktop: layout em 2 colunas
   Mobile: lista de itens empilhada
   ================================================ */

const ZSettings = (function() {

  function render(state) {
    return ZApp.isDesktop() ? renderDesktop(state) : renderMobile(state);
  }

  /* ================================================
     VERSÃO DESKTOP
     ================================================ */
  function renderDesktop(state) {
    return `
      <div class="screen-content">

        <div class="equal-row">

          <!-- Configurações gerais -->
          <div style="display:flex; flex-direction:column; gap:20px">

            <div class="card">
              <div class="card-header"><h3>👤 Conta</h3></div>
              ${settingsItem('👤', '#EFF6FF', 'Perfil', 'Nome, foto e informações pessoais', "ZApp.openModal('editProfile', {})")}
            </div>

            <div class="card">
              <div class="card-header"><h3>📁 Dados Financeiros</h3></div>
              <div style="display:flex; flex-direction:column; gap:0">
                ${settingsItem('🏷️', '#F5F3FF', 'Categorias', 'Gerenciar categorias de receitas e despesas', "ZApp.openModal('manageCategories', {})")}
                <div style="border-top:1px solid var(--border-light)"></div>
                ${settingsItem('📐', '#ECFDF5', 'Gabarito Financeiro', 'Percentuais ideais por categoria (benchmark)', "ZApp.openModal('editBenchmarks', {})")}
                <div style="border-top:1px solid var(--border-light)"></div>
                ${settingsItem('📂', '#FFF7ED', 'Importar Extrato', 'CSV (Nubank, Inter) ou OFX', "ZApp.openModal('importTransactions', {})")}
              </div>
            </div>

            <div class="card">
              <div class="card-header"><h3>✨ Inteligência Artificial</h3></div>
              <div style="padding:16px">
                <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px; line-height:1.5">
                  Insira sua chave da API Claude (Anthropic) para ativar o diagnóstico financeiro com IA e a categorização automática de extratos.
                </div>
                <div style="display:flex; gap:8px; align-items:center">
                  <input type="password" id="claude-key-input" class="form-input" placeholder="sk-ant-api..."
                    value="${ZAI.getKey()}"
                    style="flex:1; font-size:13px"
                    onkeydown="if(event.key==='Enter') ZSettings.saveClaudeKey()">
                  <button onclick="ZSettings.saveClaudeKey()"
                    style="padding:10px 16px; background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap">
                    Salvar
                  </button>
                </div>
                ${ZAI.hasKey() ? `<div style="margin-top:8px; font-size:12px; color:var(--success); font-weight:600">✅ Chave configurada</div>` : `<div style="margin-top:8px; font-size:12px; color:var(--text-muted)">Obtenha sua chave em console.anthropic.com</div>`}
              </div>
            </div>

            <div class="card">
              <div class="card-header"><h3>⚠️ Zona de Risco</h3></div>
              <div style="padding:14px; background:var(--danger-light); border-radius:var(--radius-sm); margin-bottom:12px">
                <div style="font-size:13px; color:var(--danger); font-weight:500; margin-bottom:8px">
                  Limpar dados irá remover todos os seus lançamentos locais (os dados no Supabase permanecem).
                </div>
                <button onclick="ZSettings.resetData()"
                  style="background:var(--danger); color:white; border:none; border-radius:var(--radius-sm); padding:9px 16px; font-size:13px; font-weight:700; cursor:pointer">
                  🔄 Recarregar Dados
                </button>
              </div>
            </div>
          </div>

          <!-- Sobre o app + Info -->
          <div style="display:flex; flex-direction:column; gap:20px">

            <!-- Card principal do app -->
            <div style="background:linear-gradient(135deg, var(--primary) 0%, #1D4ED8 60%, var(--purple) 100%); border-radius:var(--radius-lg); padding:28px; color:white; text-align:center; box-shadow:var(--shadow-lg)">
              <div style="font-size:48px; margin-bottom:12px">💎</div>
              <div style="font-size:28px; font-weight:900; letter-spacing:-1px; margin-bottom:6px">ZAFINN</div>
              <div style="font-size:14px; opacity:0.85; margin-bottom:20px">Suas finanças bem organizadas</div>
              <div style="background:rgba(255,255,255,0.15); border-radius:var(--radius-sm); padding:12px 16px; font-size:12px; opacity:0.9">
                Versão 1.0 · Pure HTML/CSS/JS
              </div>
            </div>

            <!-- Funcionalidades -->
            <div class="card">
              <div class="card-header"><h3>✅ Funcionalidades</h3></div>
              ${[
                ['💵', 'Orçamento mensal', 'Planejamento de receitas e despesas'],
                ['💳', 'Lançamentos', 'Registro de transações reais'],
                ['📊', 'Análise', 'Comparativo orçado x realizado'],
                ['🔮', 'Fluxo Futuro', 'Projeções e parcelas futuras'],
                ['🏦', 'Patrimônio', 'Bens, ativos e dívidas'],
                ['🩺', 'Diagnóstico', 'Análise automática da saúde financeira'],
              ].map(([emoji, title, sub]) => `
                <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-light)">
                  <span style="font-size:20px; width:30px; text-align:center">${emoji}</span>
                  <div>
                    <div style="font-size:13px; font-weight:600">${title}</div>
                    <div style="font-size:11px; color:var(--text-muted)">${sub}</div>
                  </div>
                  <svg style="margin-left:auto; color:var(--success)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              `).join('')}
            </div>

            <!-- Atalhos de navegação -->
            <div class="card">
              <div class="card-header"><h3>🚀 Navegação Rápida</h3></div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
                ${[
                  ['dashboard', '📊', 'Dashboard'],
                  ['budget', '📋', 'Orçamento'],
                  ['transactions', '💳', 'Lançamentos'],
                  ['comparison', '📈', 'Análise'],
                  ['cashflow', '🔮', 'Fluxo Futuro'],
                  ['patrimony', '🏦', 'Patrimônio'],
                ].map(([screen, emoji, label]) => `
                  <button onclick="ZApp.navigate('${screen}')"
                    style="padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--text); transition:all 0.15s"
                    onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)'"
                    onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text)'">
                    <span style="font-size:16px">${emoji}</span>
                    ${label}
                  </button>
                `).join('')}
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  function settingsItem(icon, iconBg, title, sub, onclick) {
    return `
      <div class="settings-item" ${onclick ? `onclick="${onclick}"` : ''} style="cursor:${onclick ? 'pointer' : 'default'}">
        <div class="si-icon" style="background:${iconBg}">${icon}</div>
        <div class="si-text">
          <div class="si-title">${title}</div>
          <div class="si-sub">${sub}</div>
        </div>
        ${onclick ? `<svg class="si-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
      </div>
    `;
  }

  /* ================================================
     VERSÃO MOBILE
     ================================================ */
  function renderMobile(state) {
    return `
      <div class="screen-header">
        <div>
          <div class="subtitle">Preferências</div>
          <h1>Configurações</h1>
        </div>
      </div>

      <div class="screen-content">
        <div class="spacer-sm"></div>

        <div style="padding:0 16px 6px">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px">Conta</div>
          <div style="background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
            ${settingsItem('👤', '#EFF6FF', 'Perfil', 'Nome, foto e informações pessoais', "ZApp.openModal('editProfile', {})")}
          </div>
        </div>

        <div style="padding:10px 16px 6px">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px">Dados</div>
          <div style="background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
            ${settingsItem('🏷️', '#F5F3FF', 'Categorias', 'Gerenciar categorias de receitas e despesas', "ZApp.openModal('manageCategories', {})")}
            <div style="border-top:1px solid var(--border-light)"></div>
            ${settingsItem('📐', '#ECFDF5', 'Gabarito Financeiro', 'Percentuais ideais por categoria', "ZApp.openModal('editBenchmarks', {})")}
            <div style="border-top:1px solid var(--border-light)"></div>
            ${settingsItem('📂', '#FFF7ED', 'Importar Extrato', 'CSV (Nubank, Inter) ou OFX', "ZApp.openModal('importTransactions', {})")}
          </div>
        </div>

        <div style="padding:10px 16px 6px">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px">Inteligência Artificial</div>
          <div style="background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm); padding:16px">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px">Chave API Claude (Anthropic) para ativar diagnóstico com IA</div>
            <div style="display:flex; gap:8px">
              <input type="password" id="claude-key-input-mobile" class="form-input" placeholder="sk-ant-api..."
                value="${ZAI.getKey()}" style="flex:1; font-size:12px"
                onkeydown="if(event.key==='Enter') ZSettings.saveClaudeKeyMobile()">
              <button onclick="ZSettings.saveClaudeKeyMobile()"
                style="padding:10px 12px; background:var(--primary); color:white; border:none; border-radius:var(--radius-sm); font-size:12px; font-weight:700; cursor:pointer">
                Salvar
              </button>
            </div>
            ${ZAI.hasKey() ? `<div style="margin-top:6px; font-size:11px; color:var(--success); font-weight:600">✅ Chave configurada</div>` : ''}
          </div>
        </div>

        <div style="padding:10px 16px 6px">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px">Sobre</div>
          <div style="background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
            ${settingsItem('⭐', '#FFFBEB', 'ZAFINN', 'Versão 1.0 · Suas finanças bem organizadas', '')}
          </div>
        </div>

        <div style="padding:10px 16px 6px">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px">Dados</div>
          <div style="background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm)">
            <div class="settings-item" onclick="ZSettings.resetData()" style="color:var(--danger); cursor:pointer">
              <div class="si-icon" style="background:var(--danger-light)">🔄</div>
              <div class="si-text">
                <div class="si-title" style="color:var(--danger)">Restaurar Dados Demo</div>
                <div class="si-sub">Volta para os dados de exemplo</div>
              </div>
            </div>
          </div>
        </div>

        <div style="margin:20px 16px; padding:16px; background:linear-gradient(135deg, var(--primary) 0%, #1D4ED8 100%); border-radius:var(--radius-lg); color:white; text-align:center">
          <div style="font-size:28px; margin-bottom:8px">💎</div>
          <div style="font-size:18px; font-weight:800; margin-bottom:4px">ZAFINN</div>
          <div style="font-size:12px; opacity:0.8">Suas finanças bem organizadas</div>
        </div>

        <div class="spacer-lg"></div>
      </div>
    `;
  }

  async function resetData() {
    if (confirm('Limpar todos os seus dados? Esta ação não pode ser desfeita.')) {
      ZApp.state.data = await ZDB.loadAll(ZApp.state.month);
      ZApp.navigate('dashboard');
    }
  }

  function saveClaudeKey() {
    const key = document.getElementById('claude-key-input')?.value?.trim();
    if (!key) { alert('Digite a chave da API Claude.'); return; }
    if (!key.startsWith('sk-ant-')) { alert('A chave deve começar com sk-ant-...'); return; }
    ZAI.setKey(key);
    ZApp.render();
  }

  function saveClaudeKeyMobile() {
    const key = document.getElementById('claude-key-input-mobile')?.value?.trim();
    if (!key) { alert('Digite a chave da API Claude.'); return; }
    if (!key.startsWith('sk-ant-')) { alert('A chave deve começar com sk-ant-...'); return; }
    ZAI.setKey(key);
    ZApp.render();
  }

  return { render, resetData, saveClaudeKey, saveClaudeKeyMobile };

})();
