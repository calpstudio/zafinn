/* ================================================
   ZAFINN - Módulo de IA (Claude)
   Análise financeira e categorização automática.
   Usa Supabase Edge Function como proxy para a API.
   ================================================ */

const ZAI = (function() {

  const KEY_STORAGE = 'zafinn_claude_key';

  /* ---------- Gerenciar chave API ---------- */
  function getKey()       { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setKey(key)    { localStorage.setItem(KEY_STORAGE, key.trim()); }
  function hasKey()       { return !!getKey(); }

  /* ---------- Chamar Claude via Edge Function ---------- */
  async function _call(prompt, model) {
    const apiKey = getKey();
    if (!apiKey) throw new Error('Configure sua chave da API Claude nas Configurações.');

    const { data, error } = await _sb.functions.invoke('ai-analyze', {
      body: {
        apiKey,
        model: model || 'claude-haiku-4-5-20251001',
        prompt
      }
    });

    if (error) throw new Error('Erro na função: ' + error.message);
    if (data?.error) throw new Error(data.error.message || 'Erro da API Claude.');

    return data?.content?.[0]?.text || '';
  }

  /* ================================================
     ANÁLISE FINANCEIRA DO MÊS
     ================================================ */
  async function analyzeMonth(state, month) {
    const { data } = state;
    const totals   = ZData.getMonthTotals(data, month);
    const catReal  = ZData.getCategoryTotals(data, month);
    const netWorth = ZData.getNetWorth(data);
    const monthName = ZUtils.getMonthName(month);

    const catLines = Object.entries(catReal)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`)
      .join('\n');

    const bench = data.benchmarks || {};
    const benchLines = Object.entries(bench)
      .map(([cat, b]) => `- ${cat}: entre ${b.min}% e ${b.max}% da renda`)
      .join('\n');

    const prompt = `Você é um consultor financeiro especializado em finanças pessoais brasileiras. Analise os dados financeiros de ${monthName} e forneça um diagnóstico claro, objetivo e em português brasileiro.

DADOS DO MÊS (${monthName}):
- Receita realizada: R$ ${totals.realIncome.toFixed(2)}
- Despesa realizada: R$ ${totals.realExpense.toFixed(2)}
- Saldo do mês: R$ ${(totals.realIncome - totals.realExpense).toFixed(2)}
- Receita orçada: R$ ${totals.budgetIncome.toFixed(2)}
- Despesa orçada: R$ ${totals.budgetExpense.toFixed(2)}

GASTOS POR CATEGORIA:
${catLines || 'Nenhum gasto registrado'}

PATRIMÔNIO:
- Total de bens: R$ ${netWorth.totalAssets.toFixed(2)}
- Total de dívidas: R$ ${netWorth.totalDebts.toFixed(2)}
- Patrimônio líquido: R$ ${netWorth.netWorth.toFixed(2)}

GABARITO FINANCEIRO IDEAL:
${benchLines}

Por favor, forneça:
1. **Pontos Positivos** (máximo 3)
2. **Pontos de Atenção** (máximo 3)
3. **Recomendações Práticas** (máximo 3 ações concretas)
4. **Nota da Saúde Financeira** (de 0 a 10 com justificativa de 1 linha)

Seja direto, use números reais da análise. Fale em português do Brasil.`;

    return await _call(prompt, 'claude-sonnet-4-6');
  }

  /* ================================================
     CATEGORIZAÇÃO AUTOMÁTICA DE TRANSAÇÕES
     ================================================ */
  async function categorize(transactions, categories) {
    if (!transactions || transactions.length === 0) return [];

    const txList = transactions.slice(0, 50).map((t, i) =>
      `${i}: ${t.description} (R$ ${t.amount.toFixed(2)}, ${t.type === 'expense' ? 'despesa' : 'receita'})`
    ).join('\n');

    const catList = [
      ...categories.incomes.slice(0, 10),
      ...categories.expenses.slice(0, 15)
    ].join(', ');

    const prompt = `Você é um assistente de categorização financeira. Para cada transação abaixo, determine a categoria mais adequada.

CATEGORIAS DISPONÍVEIS:
${catList}

TRANSAÇÕES (formato: índice: descrição):
${txList}

Responda APENAS com um JSON válido no formato:
{"categories": ["categoria0", "categoria1", "categoria2", ...]}

- Use exatamente os nomes das categorias fornecidas
- Para transações de receita use: Salário, Renda Extra, Aluguéis, Investimentos, Outras Receitas
- Para transações de despesa use as categorias de despesa
- Se não souber, use "Outros"
- Responda APENAS o JSON, sem texto adicional`;

    const result = await _call(prompt, 'claude-haiku-4-5-20251001');

    try {
      const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
      return parsed.categories || [];
    } catch(e) {
      console.warn('Erro ao parsear categorias:', e);
      return transactions.map(() => 'Outros');
    }
  }

  /* ================================================
     EXTRAÇÃO DE TRANSAÇÕES DE PDF / IMAGEM
     ================================================ */
  async function extractFromFile(fileBase64, mimeType, categories) {
    const apiKey = getKey();
    if (!apiKey) throw new Error('Configure sua chave Claude nas Configurações.');

    const catList = [
      ...(categories?.expenses || []),
      ...(categories?.incomes  || [])
    ].join(', ');

    const hoje = new Date().toLocaleDateString('pt-BR');
    const anoAtual = new Date().getFullYear();
    const anoAnterior = anoAtual - 1;
    const prompt = `Você é um especialista em faturas de cartão de crédito brasileiras. Sua tarefa é extrair TODAS as linhas de transação desta fatura, sem pular nenhuma.

CONTEXTO: Hoje é ${hoje}. Ano atual: ${anoAtual}.

Categorias disponíveis: ${catList}

=== COMO FUNCIONA UMA FATURA DE CARTÃO BRASILEIRO ===

1. CADA LINHA DA FATURA = UMA TRANSAÇÃO NO JSON. Não agrupe, não resuma, não pule.

2. NOTAÇÃO DE PARCELAS — "06/12" no nome NÃO É DATA. Significa "parcela 6 de 12".
   Exemplos: "MonalizaAlves 11/12" = parcela 11 de 12. "Mercadopago 08/12" = parcela 8 de 12.
   Extraia normalmente como despesa com o nome completo incluindo a notação de parcela.

3. DATAS DE COMPRA — a data mostrada (ex: "24/04", "16/07") é quando a compra foi feita.
   Pode ser de meses ou anos anteriores ao vencimento da fatura. Determine o ano assim:
   - Se a fatura vence em março/${anoAtual}: datas de jan/fev/mar = ${anoAtual}, datas de abr-dez = ${anoAnterior}
   - Se a fatura vence em abril/${anoAtual}: datas de jan-abr = ${anoAtual}, datas de mai-dez = ${anoAnterior}
   - Se a fatura vence em maio/${anoAtual}: datas de jan-mai = ${anoAtual}, datas de jun-dez = ${anoAnterior}
   - Regra geral: se o mês da data for maior que o mês de vencimento, o ano é ${anoAnterior}

4. SEÇÕES — a fatura pode ter "Lançamentos Nacionais", "Lançamentos Internacionais", etc.
   Extraia TODAS as linhas de TODAS as seções igualmente.

=== IGNORAR COMPLETAMENTE ===
- "Pagamento de Fatura via PIX", "Pagamento via Boleto", "Pagamento via TED" — não são despesas
- Linhas de totais, subtotais, limites, saldo disponível
- Cabeçalhos de seção

=== FORMATO DE SAÍDA ===
Retorne APENAS JSON válido, sem nenhum texto antes ou depois:
{"transactions": [{"date": "YYYY-MM-DD", "description": "Nome completo do estabelecimento incluindo parcela se houver", "amount": 0.00, "type": "expense", "category": "Categoria"}]}

Regras finais:
- type "expense" para compras/débitos · type "income" APENAS para estornos/devoluções de estabelecimentos
- Estornos/devoluções → category "Estorno/Devolução"
- Repasse de IOF, Seguro Cartão → category "Tarifas Bancárias", type "expense"
- Restaurantes, lanchonetes, delivery → Alimentação
- Postos de combustível, pedágio, Uber, ônibus → Transporte
- Farmácias, hospitais, planos de saúde → Saúde
- Netflix, Spotify, Amazon Prime, iFood Club → Assinaturas
- amount: número positivo, sem R$ ou pontos de milhar`;

    const { data, error } = await _sb.functions.invoke('ai-analyze', {
      body: { apiKey, prompt, model: 'claude-haiku-4-5-20251001', fileBase64, mimeType }
    });

    if (error) throw new Error('Erro na função: ' + error.message);
    if (data?.error) throw new Error(data.error.message || 'Erro da API Claude.');

    const text = data?.content?.[0]?.text || '';

    // Extrair JSON da resposta de forma robusta
    const parsed = _extractJSON(text);
    if (!parsed) {
      console.warn('Resposta IA bruta:', text);
      throw new Error('Não foi possível interpretar a resposta. Tente novamente ou use CSV.');
    }
    return parsed.transactions || [];
  }

  function _extractJSON(text) {
    if (!text) return null;
    // 1. Parse direto
    try { return JSON.parse(text.trim()); } catch {}
    // 2. Remove blocos markdown
    const stripped = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    try { return JSON.parse(stripped); } catch {}
    // 3. Encontra a primeira { até a última } no texto
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch {}
    }
    return null;
  }

  /* ================================================
     ASSISTENTE DE CHAT
     ================================================ */
  async function chat(history, userMessage, financialContext) {
    const apiKey = getKey();
    if (!apiKey) throw new Error('Configure sua chave Claude nas Configurações.');

    const systemPrompt = `Você é o assistente financeiro pessoal do app ZAFINN. Fala português brasileiro, é direto, amigável e útil.

Você tem acesso aos dados financeiros do usuário e pode executar ações reais no app.

DADOS FINANCEIROS ATUAIS:
${financialContext}

AÇÕES QUE VOCÊ PODE EXECUTAR:
Quando o usuário pedir uma ação, responda com JSON neste formato:
{"message": "texto para o usuário", "action": {"type": "TIPO", "data": {...}}}

Tipos de ação:
- addTransaction: {"type": "addTransaction", "data": {"description": "...", "amount": 0.00, "type": "expense|income", "category": "...", "account": "...", "date": "YYYY-MM-DD"}}
- deleteTransaction: {"type": "deleteTransaction", "data": {"description": "parte do nome"}}
- navigate: {"type": "navigate", "data": {"screen": "dashboard|transactions|accounts|cards|budget"}}
- openImport: {"type": "openImport", "data": {}}

Se não houver ação, responda só com: {"message": "sua resposta"}

REGRAS:
- Use os dados reais do usuário nas respostas
- Para lançamentos sem data, use hoje
- Se a conta não for especificada e houver dúvida, pergunte
- Valores monetários: sempre use formato brasileiro (R$ 1.234,56)
- Seja conciso — máximo 3 parágrafos
- Confirme ações executadas de forma clara`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const { data, error } = await _sb.functions.invoke('ai-analyze', {
      body: {
        apiKey,
        model: 'claude-haiku-4-5-20251001',
        prompt: userMessage,
        messages,
        systemPrompt
      }
    });

    if (error) throw new Error('Erro: ' + error.message);
    if (data?.error) throw new Error(data.error.message || 'Erro da API.');

    const text = (data?.content?.[0]?.text || '').trim();

    // Tenta parsear como JSON (quando há ação)
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.message) return parsed;
    } catch {}

    // Tenta encontrar JSON no texto
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (parsed.message) return parsed;
      } catch {}
    }

    // Resposta pura de texto
    return { message: text };
  }

  return { getKey, setKey, hasKey, analyzeMonth, categorize, extractFromFile, chat };

})();
