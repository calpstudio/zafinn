/* ================================================
   ZAFINN - Parser de Extratos Bancários
   Suporte: CSV (Nubank, genérico) e OFX
   ================================================ */

const ZImport = (function() {

  /* ---------- Detectar e parsear arquivo ---------- */
  function parse(text, fileName) {
    const ext = (fileName || '').toLowerCase().split('.').pop();
    if (ext === 'ofx' || text.includes('<OFX>') || text.includes('OFXHEADER')) {
      return parseOFX(text);
    }
    if (isNubankCSV(text)) return parseNubank(text);
    if (isInterCSV(text))  return parseInter(text);
    return parseGenericCSV(text);
  }

  /* ================================================
     OFX — formato dos bancos brasileiros
     ================================================ */
  function parseOFX(text) {
    const transactions = [];
    const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

    blocks.forEach(block => {
      const type    = (block.match(/<TRNTYPE>([^<\r\n]+)/i) || [])[1]?.trim();
      const dtRaw   = (block.match(/<DTPOSTED>([^<\r\n]+)/i) || [])[1]?.trim();
      const amount  = parseFloat((block.match(/<TRNAMT>([^<\r\n]+)/i) || [])[1]?.trim() || '0');
      const memo    = (block.match(/<MEMO>([^<\r\n]+)/i) || [])[1]?.trim()
                   || (block.match(/<NAME>([^<\r\n]+)/i) || [])[1]?.trim()
                   || 'Sem descrição';

      if (!dtRaw || amount === 0) return;

      // DTPOSTED: 20260605 ou 20260605120000
      const y = dtRaw.substring(0, 4);
      const m = dtRaw.substring(4, 6);
      const d = dtRaw.substring(6, 8);
      const date = `${y}-${m}-${d}`;

      transactions.push({
        date,
        description: memo,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        category: ''
      });
    });

    return transactions;
  }

  /* ================================================
     NUBANK CSV
     Header: Data,Categoria,Título,Valor
     ================================================ */
  function isNubankCSV(text) {
    const h = text.split('\n')[0].toLowerCase();
    return h.includes('título') || h.includes('titulo') || h.includes('nubank');
  }

  function parseNubank(text) {
    const lines = text.trim().split('\n');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = splitCSVLine(line);
      const amount = parseAmount(cols[3] || '0');
      return {
        date: parseDate(cols[0] || ''),
        description: (cols[2] || '').replace(/^"|"$/g, '').trim(),
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        category: cols[1] || ''
      };
    }).filter(t => t.amount > 0 && t.date);
  }

  /* ================================================
     INTER CSV
     Header: Data Lançamento;Descrição;Valor;Tipo
     ================================================ */
  function isInterCSV(text) {
    const h = text.split('\n')[0].toLowerCase();
    return h.includes('lançamento') || h.includes('lancamento');
  }

  function parseInter(text) {
    const sep = text.includes(';') ? ';' : ',';
    const lines = text.trim().split('\n');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
      const amount = parseAmount(cols[2] || '0');
      const isExpense = (cols[3] || '').toLowerCase().includes('déb') || amount < 0;
      return {
        date: parseDate(cols[0] || ''),
        description: cols[1] || '',
        amount: Math.abs(amount),
        type: isExpense ? 'expense' : 'income',
        category: ''
      };
    }).filter(t => t.amount > 0 && t.date);
  }

  /* ================================================
     CSV GENÉRICO — detecção automática de colunas
     ================================================ */
  function parseGenericCSV(text) {
    const sep = detectSeparator(text);
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());

    // Tentar encontrar colunas por nome
    const dateIdx   = findCol(headers, ['data', 'date', 'dt', 'data lançamento', 'data transação']);
    const descIdx   = findCol(headers, ['descrição', 'descricao', 'description', 'histórico', 'historico', 'memo', 'título', 'titulo', 'lançamento']);
    const amtIdx    = findCol(headers, ['valor', 'amount', 'value', 'vlr', 'débito', 'debito', 'crédito', 'credito']);
    const typeIdx   = findCol(headers, ['tipo', 'type', 'natureza', 'dc', 'd/c']);

    if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
      // fallback: assume colunas 0=data, 1=desc, 2=valor
      return lines.slice(1).map(line => {
        const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
        const amount = parseAmount(cols[2] || '0');
        return {
          date: parseDate(cols[0] || ''),
          description: cols[1] || '',
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : 'income',
          category: ''
        };
      }).filter(t => t.amount > 0 && t.date);
    }

    return lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
      const amount = parseAmount(cols[amtIdx] || '0');
      const typeRaw = typeIdx >= 0 ? (cols[typeIdx] || '').toLowerCase() : '';
      const isExpense = typeRaw.includes('d') || typeRaw.includes('déb') || amount < 0;

      return {
        date: parseDate(cols[dateIdx] || ''),
        description: cols[descIdx] || '',
        amount: Math.abs(amount),
        type: isExpense ? 'expense' : 'income',
        category: ''
      };
    }).filter(t => t.amount > 0 && t.date);
  }

  /* ================================================
     Utilitários de parsing
     ================================================ */
  function detectSeparator(text) {
    const first = text.split('\n')[0];
    const semicolons = (first.match(/;/g) || []).length;
    const commas = (first.match(/,/g) || []).length;
    const tabs = (first.match(/\t/g) || []).length;
    if (tabs > semicolons && tabs > commas) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  }

  function findCol(headers, candidates) {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  function parseDate(str) {
    if (!str) return '';
    str = str.trim().replace(/['"]/g, '');

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);

    // DD/MM/YYYY ou DD/MM/YY
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dmy) {
      const y = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
      return `${y}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
    }

    // MM/DD/YYYY (fallback americano)
    const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;

    return '';
  }

  function parseAmount(str) {
    if (!str) return 0;
    str = str.toString().replace(/['"R$\s]/g, '');

    // Formato brasileiro: 1.234,56
    if (/\d+\.\d{3},\d{2}$/.test(str)) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    // Vírgula como decimal: 1234,56
    if (/,\d{1,2}$/.test(str)) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0;
  }

  /* ---------- Detectar mês a partir de lista de transações ---------- */
  function detectMonth(transactions) {
    const months = {};
    transactions.forEach(t => {
      const ym = (t.date || '').substring(0, 7);
      if (ym) months[ym] = (months[ym] || 0) + 1;
    });
    const sorted = Object.entries(months).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || ZUtils.getCurrentMonth();
  }

  return { parse, detectMonth, parseDate, parseAmount };

})();
