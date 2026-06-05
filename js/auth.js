/* ================================================
   ZAFINN - Módulo de Autenticação
   Login, Cadastro, Recuperação de Senha, Logout
   ================================================ */

const ZAuth = (function() {

  let _session = null;
  let _user = null;

  /* ---------- Tradução de erros do Supabase ---------- */
  const ERROS = {
    'Invalid login credentials':      'E-mail ou senha incorretos.',
    'Email not confirmed':            'Confirme seu e-mail antes de entrar.',
    'User already registered':        'Este e-mail já está cadastrado.',
    'Password should be at least 6':  'A senha deve ter pelo menos 6 caracteres.',
    'Signup requires a valid password': 'Digite uma senha válida.',
    'Unable to validate email address: invalid format': 'E-mail inválido.',
    'Email rate limit exceeded':      'Muitas tentativas. Aguarde alguns minutos.',
    'For security purposes, you can only request this after':
      'Aguarde um momento antes de solicitar novamente.',
  };

  function traduzirErro(msg) {
    if (!msg) return 'Ocorreu um erro. Tente novamente.';
    for (const [en, pt] of Object.entries(ERROS)) {
      if (msg.includes(en)) return pt;
    }
    return msg;
  }

  /* ---------- Inicializar (verificar sessão) ---------- */
  async function init() {
    try {
      const { data } = await _sb.auth.getSession();
      if (data && data.session) {
        _session = data.session;
        _user = data.session.user;
        return true;
      }
    } catch(e) {
      console.error('ZAuth.init error:', e);
    }
    return false;
  }

  /* ---------- Dados do usuário ---------- */
  function getUser()    { return _user; }
  function getUserName() {
    if (!_user) return 'Usuário';
    return _user.user_metadata?.full_name || _user.email?.split('@')[0] || 'Usuário';
  }
  function getUserInitials() {
    const name = getUserName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  function getUserEmail() { return _user?.email || ''; }

  /* ---------- Ações de autenticação ---------- */
  async function signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traduzirErro(error.message));
    _session = data.session;
    _user = data.user;
  }

  async function signUp(fullName, email, password) {
    const { data, error } = await _sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw new Error(traduzirErro(error.message));
    return data;
  }

  async function signOut() {
    await _sb.auth.signOut();
    _session = null;
    _user = null;
    renderAuthScreen('login');
  }

  async function resetPassword(email) {
    const redirectTo = window.location.href.replace(/[?#].*$/, '');
    const { error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(traduzirErro(error.message));
  }

  /* ---------- Handlers dos formulários ---------- */
  async function handleLogin() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const errEl = document.getElementById('auth-error');

    if (!email || !password) {
      if (errEl) errEl.textContent = 'Preencha e-mail e senha.';
      return;
    }

    const btn = document.getElementById('auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
    if (errEl) errEl.textContent = '';

    try {
      await signIn(email, password);
      await ZApp.init();
    } catch(e) {
      if (errEl) errEl.textContent = e.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  }

  async function handleRegister() {
    const fullName = document.getElementById('auth-fullname')?.value?.trim();
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const confirm  = document.getElementById('auth-password2')?.value;
    const errEl    = document.getElementById('auth-error');

    if (!fullName || !email || !password) {
      if (errEl) errEl.textContent = 'Preencha todos os campos.';
      return;
    }
    if (password !== confirm) {
      if (errEl) errEl.textContent = 'As senhas não coincidem.';
      return;
    }
    if (password.length < 6) {
      if (errEl) errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    const btn = document.getElementById('auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Criando conta...'; }
    if (errEl) errEl.textContent = '';

    try {
      await signUp(fullName, email, password);
      renderAuthScreen('check-email');
    } catch(e) {
      if (errEl) errEl.textContent = e.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Criar conta'; }
    }
  }

  async function handleForgot() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const errEl = document.getElementById('auth-error');

    if (!email) {
      if (errEl) errEl.textContent = 'Digite seu e-mail.';
      return;
    }

    const btn = document.getElementById('auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    if (errEl) errEl.textContent = '';

    try {
      await resetPassword(email);
      renderAuthScreen('check-email-reset');
    } catch(e) {
      if (errEl) errEl.textContent = e.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar link'; }
    }
  }

  /* ---------- Renderizar tela de autenticação ---------- */
  function renderAuthScreen(view) {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    let content = '';

    if (view === 'login') {
      content = `
        <div class="auth-card">
          <div class="auth-logo">
            <div class="auth-logo-icon">💎</div>
            <div>
              <div class="auth-logo-name">ZAFINN</div>
              <div class="auth-logo-sub">finanças bem organizadas</div>
            </div>
          </div>
          <h2 class="auth-title">Bem-vindo de volta</h2>
          <p class="auth-subtitle">Entre na sua conta para continuar</p>
          <div id="auth-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">E-mail</label>
            <input id="auth-email" type="email" class="auth-input" placeholder="seu@email.com"
              onkeydown="if(event.key==='Enter') document.getElementById('auth-password').focus()">
          </div>
          <div class="auth-field">
            <label class="auth-label">Senha</label>
            <input id="auth-password" type="password" class="auth-input" placeholder="••••••••"
              onkeydown="if(event.key==='Enter') ZAuth.handleLogin()">
          </div>
          <button id="auth-submit-btn" class="auth-btn" onclick="ZAuth.handleLogin()">Entrar</button>
          <div class="auth-links">
            <button class="auth-link" onclick="ZAuth.renderAuthScreen('forgot')">Esqueci minha senha</button>
            <span style="color:var(--text-muted)">•</span>
            <button class="auth-link" onclick="ZAuth.renderAuthScreen('register')">Criar conta</button>
          </div>
        </div>
      `;
    }

    else if (view === 'register') {
      content = `
        <div class="auth-card">
          <div class="auth-logo">
            <div class="auth-logo-icon">💎</div>
            <div>
              <div class="auth-logo-name">ZAFINN</div>
              <div class="auth-logo-sub">finanças bem organizadas</div>
            </div>
          </div>
          <h2 class="auth-title">Criar conta</h2>
          <p class="auth-subtitle">Comece a organizar suas finanças hoje</p>
          <div id="auth-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">Nome completo</label>
            <input id="auth-fullname" type="text" class="auth-input" placeholder="Seu nome"
              onkeydown="if(event.key==='Enter') document.getElementById('auth-email').focus()">
          </div>
          <div class="auth-field">
            <label class="auth-label">E-mail</label>
            <input id="auth-email" type="email" class="auth-input" placeholder="seu@email.com"
              onkeydown="if(event.key==='Enter') document.getElementById('auth-password').focus()">
          </div>
          <div class="auth-field">
            <label class="auth-label">Senha</label>
            <input id="auth-password" type="password" class="auth-input" placeholder="Mínimo 6 caracteres"
              onkeydown="if(event.key==='Enter') document.getElementById('auth-password2').focus()">
          </div>
          <div class="auth-field">
            <label class="auth-label">Confirmar senha</label>
            <input id="auth-password2" type="password" class="auth-input" placeholder="Repita a senha"
              onkeydown="if(event.key==='Enter') ZAuth.handleRegister()">
          </div>
          <button id="auth-submit-btn" class="auth-btn" onclick="ZAuth.handleRegister()">Criar conta</button>
          <div class="auth-links">
            <span style="color:var(--text-muted)">Já tem conta?</span>
            <button class="auth-link" onclick="ZAuth.renderAuthScreen('login')">Entrar</button>
          </div>
        </div>
      `;
    }

    else if (view === 'forgot') {
      content = `
        <div class="auth-card">
          <div class="auth-logo">
            <div class="auth-logo-icon">💎</div>
            <div>
              <div class="auth-logo-name">ZAFINN</div>
              <div class="auth-logo-sub">finanças bem organizadas</div>
            </div>
          </div>
          <h2 class="auth-title">Recuperar senha</h2>
          <p class="auth-subtitle">Enviaremos um link para redefinir sua senha</p>
          <div id="auth-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">E-mail cadastrado</label>
            <input id="auth-email" type="email" class="auth-input" placeholder="seu@email.com"
              onkeydown="if(event.key==='Enter') ZAuth.handleForgot()">
          </div>
          <button id="auth-submit-btn" class="auth-btn" onclick="ZAuth.handleForgot()">Enviar link de recuperação</button>
          <div class="auth-links">
            <button class="auth-link" onclick="ZAuth.renderAuthScreen('login')">← Voltar para login</button>
          </div>
        </div>
      `;
    }

    else if (view === 'check-email') {
      content = `
        <div class="auth-card" style="text-align:center">
          <div class="auth-logo" style="justify-content:center">
            <div class="auth-logo-icon">💎</div>
            <div>
              <div class="auth-logo-name">ZAFINN</div>
            </div>
          </div>
          <div style="font-size:48px; margin:24px 0">📬</div>
          <h2 class="auth-title">Verifique seu e-mail</h2>
          <p class="auth-subtitle" style="margin-bottom:24px">
            Enviamos um link de confirmação para seu e-mail.<br>
            Clique no link para ativar sua conta e depois entre aqui.
          </p>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:24px">
            Não recebeu? Verifique a caixa de spam ou
            <button class="auth-link" onclick="ZAuth.renderAuthScreen('register')">tente novamente</button>.
          </p>
          <button class="auth-btn" onclick="ZAuth.renderAuthScreen('login')">Ir para o login</button>
        </div>
      `;
    }

    else if (view === 'check-email-reset') {
      content = `
        <div class="auth-card" style="text-align:center">
          <div class="auth-logo" style="justify-content:center">
            <div class="auth-logo-icon">💎</div>
            <div>
              <div class="auth-logo-name">ZAFINN</div>
            </div>
          </div>
          <div style="font-size:48px; margin:24px 0">🔑</div>
          <h2 class="auth-title">Link enviado!</h2>
          <p class="auth-subtitle" style="margin-bottom:24px">
            Se este e-mail estiver cadastrado, você receberá as instruções em instantes.
          </p>
          <button class="auth-btn" onclick="ZAuth.renderAuthScreen('login')">Voltar para o login</button>
        </div>
      `;
    }

    appEl.innerHTML = `
      <div class="auth-container">
        <div class="auth-bg-circle auth-bg-circle-1"></div>
        <div class="auth-bg-circle auth-bg-circle-2"></div>
        ${content}
      </div>
    `;

    setTimeout(() => {
      const first = appEl.querySelector('input:not([type="hidden"])');
      if (first) first.focus();
    }, 100);
  }

  /* ---------- Listener de mudança de estado ---------- */
  _sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      _session = null;
      _user = null;
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      _session = session;
      _user = session?.user || null;
    } else if (event === 'PASSWORD_RECOVERY') {
      renderAuthScreen('login');
    }
  });

  return {
    init, signIn, signUp, signOut, resetPassword,
    handleLogin, handleRegister, handleForgot,
    getUser, getUserName, getUserInitials, getUserEmail,
    renderAuthScreen
  };

})();
