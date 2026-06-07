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
    const prompt = `Você é um especialista em extratos bancários e faturas de cartão de crédito brasileiros.

Analise este documento e extraia as transações REALIZADAS no período da fatura.

CONTEXTO: Hoje é ${hoje}. O ano atual é ${anoAtual}.

Categorias disponíveis: ${catList}

INSTRUÇÕES CRÍTICAS PARA DATAS:
- O ano atual é ${anoAtual}. Use ${anoAtual} para datas sem ano explícito, a menos que a fatura indique claramente outro ano.
- No Brasil, o formato é DD/MM/AAAA: "19/05" = dia 19 de maio de ${anoAtual}
- NÃO use 2024 nem outros anos passados sem motivo — esta é uma fatura atual
- Se a fatura mostrar "vencimento: 15/06/${anoAtual}", todas as transações são do período desse ano
- NÃO confunda dia e mês: "19/05" = dia 19, mês 05 (maio) — nunca inverta
- Extraia apenas transações JÁ REALIZADAS. IGNORE seções de "Próximas Parcelas", "Parcelas Futuras" ou débitos futuros

Retorne APENAS um JSON válido, sem texto adicional:
{"transactions": [{"date": "YYYY-MM-DD", "description": "Nome do estabelecimento", "amount": 0.00, "type": "expense", "category": "Categoria"}]}

Regras:
- type: "expense" para compras, débitos, saques · "income" para pagamentos, estornos, créditos
- amount: número positivo sem símbolo de moeda
- category: use exatamente um dos nomes da lista de categorias
- Inclua TODAS as transações realizadas, sem resumir
- Ignore: limite, saldo, totais da fatura, dados pessoais, parcelas futuras
- Restaurantes/lanchonetes → Alimentação
- Postos de combustível → Transporte
- Farmácias, hospitais → Saúde
- Salário, transferência recebida → Salário ou Renda Extra`;

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

  return { getKey, setKey, hasKey, analyzeMonth, categorize, extractFromFile };

})();
