// Adaptadores: cada provedor responde de um formato diferente. Tudo é
// normalizado para um snapshot comum usado pela interface.

export function emptySnapshot() {
  return {
    input: 0, output: 0, total: 0, cached: 0, cost: 0,
    percent: null, resetAt: null, breakdown: [], note: '', ok: true, estimated: false
  };
}

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const isoDaysAgo = days => new Date(Date.now() - days * 86400000).toISOString();
const auth = key => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const short = s => String(s || '').slice(0, 180);

export async function collectUsage(service, requestJSON) {
  const s = emptySnapshot();
  try {
    switch (service.providerId) {
      case 'opencode': await openCode(service, requestJSON, s); break;
      case 'openrouter':   await openRouter(service, requestJSON, s); break;
      case 'openai':       await openAI(service, requestJSON, s); break;
      case 'deepseek':     await deepSeek(service, requestJSON, s); break;
      case 'custom':       await custom(service, requestJSON, s); break;
      default:
        s.note = 'Este serviço não oferece API pública de uso histórico. Ative o proxy local para contar tokens em tempo real.';
    }
  } catch (e) {
    s.ok = false;
    s.note = e && e.message ? short(e.message) : 'Falha ao consultar a API.';
  }
  return s;
}

async function openCode(service, requestJSON, s) {
  // Go, Go Plus e Go Teams usam as mesmas medicoes. Tentamos as duas rotas
  // conhecidas para cobrir qualquer assinatura do OpenCode.
  const urls = [
    'https://opencode.ai/inference/go/v1/usage',
    'https://opencode.ai/zen/go/v1/usage'
  ];
  let j = null, lastError = null;
  for (const url of urls) {
    try {
      const candidate = await requestJSON({ url, headers: auth(service.apiKey) });
      if (candidate && candidate.usage) { j = candidate; break; }
    } catch (e) { lastError = e; }
  }
  if (!j) throw lastError || new Error('Não foi possível consultar o uso da assinatura OpenCode.');
  const map = { rolling: 'Janela 5h', weekly: 'Semanal', monthly: 'Mensal' };
  s.breakdown = Object.entries(map).map(([k, label]) => {
    const p = j.usage[k] || {};
    return { label, pct: n(p.percent), status: p.status || '—', resetAt: p.resetsAt || null };
  });
  const active = s.breakdown.filter(b => b.pct > 0);
  s.percent = active.length ? Math.max(...active.map(b => b.pct)) : 0;
  s.resetAt = active.filter(b => b.resetAt).map(b => b.resetAt).sort()[0] || null;
  const limit = n(service.limitTokens);
  if (limit > 0) {
    s.total = Math.round(limit * s.percent / 100);
    s.estimated = true;
    s.note = 'Tokens estimados a partir do percentual e do limite informado.';
  } else {
    s.note = 'Assinatura OpenCode (Go / Go Plus / Go Teams): a API informa percentual de uso, não contagem de tokens.';
  }
}

async function openRouter(service, requestJSON, s) {
  const headers = auth(service.apiKey);
  const base = (service.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const [info, usage] = await Promise.all([
    requestJSON({ url: `${base}/key`, headers }).catch(() => ({})),
    requestJSON({ url: `${base}/usage`, headers })
  ]);
  const rows = Array.isArray(usage?.data) ? usage.data : [];
  const since = isoDaysAgo(30);
  for (const r of rows) {
    if (r.date && r.date < since) continue;
    s.input += n(r.prompt_tokens);
    s.output += n(r.completion_tokens);
    s.total += n(r.total_tokens || (n(r.prompt_tokens) + n(r.completion_tokens)));
    s.cost += n(r.cost ?? r.total_cost);
  }
  const limit = n(info?.data?.limit);
  const used = n(info?.data?.usage);
  if (limit > 0) s.percent = Math.min(100, used / limit * 100);
  s.resetAt = info?.data?.usage_daily_reset || null;
  const byModel = {};
  for (const r of rows) {
    if (r.date && r.date < since) continue;
    const m = r.model || 'outros';
    byModel[m] = (byModel[m] || 0) + n(r.total_tokens || n(r.prompt_tokens) + n(r.completion_tokens));
  }
  s.breakdown = Object.entries(byModel).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, total]) => ({ label: '· ' + label, value: fmtK(total) }));
  s.note = 'Totais dos últimos 30 dias.';
}

async function openAI(service, requestJSON, s) {
  const base = (service.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${base}/organization/usage/completions?start_date=${encodeURIComponent(isoDaysAgo(30))}&end_date=${encodeURIComponent(new Date().toISOString())}&bucket_width=1d&limit=31`;
  const j = await requestJSON({ url, headers: auth(service.apiKey) });
  const buckets = Array.isArray(j?.data) ? j.data : [];
  for (const b of buckets) {
    for (const r of (Array.isArray(b.results) ? b.results : [])) {
      s.input += n(r.input_tokens);
      s.output += n(r.output_tokens);
      s.total += n(r.total_tokens || n(r.input_tokens) + n(r.output_tokens));
    }
  }
  s.breakdown = buckets.filter(b => b.results?.length).slice(-7).map(b => ({
    label: String(b.start_time || '').slice(0, 10),
    value: fmtK(b.results.reduce((a, r) => a + n(r.total_tokens || n(r.input_tokens) + n(r.output_tokens)), 0))
  }));
  s.note = 'Uso da organização nos últimos 30 dias. A Admin API não informa custo; o valor em $ pode ser estimado nos Ajustes.';
}

async function deepSeek(service, requestJSON, s) {
  const base = (service.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const j = await requestJSON({ url: `${base}/user/balance`, headers: auth(service.apiKey) });
  const b = j?.balance || {};
  const remaining = n(b.total_balance);
  s.breakdown = [
    { label: 'Saldo disponível', value: `$${remaining.toFixed(2)}` },
    { label: 'Crédito concedido', value: `$${n(b.granted_balance).toFixed(2)}` },
    { label: 'Recarga', value: `$${n(b.topped_up_balance).toFixed(2)}` }
  ];
  const initial = n(service.initialCredits);
  if (initial > 0 && remaining < initial) {
    const spent = initial - remaining;
    // preço médio aproximado DeepSeek (USD / 1M tokens)
    const rate = 0.5;
    s.total = Math.round(spent / rate * 1e6);
    s.cost = spent;
    s.estimated = true;
    s.note = 'Tokens estimados pelo saldo gasto (taxa média de $0,50/1M). Use o proxy para contagem exata.';
  } else {
    s.note = 'A API do DeepSeek informa saldo em USD, não tokens. Use o proxy para contagem exata.';
  }
}

async function custom(service, requestJSON, s) {
  if (!service.usageUrl) {
    s.note = 'Endpoint de uso não informado. Configure um endpoint ou use o proxy local.';
    return;
  }
  const j = await requestJSON({ url: service.usageUrl, headers: auth(service.apiKey) });
  const found = findTokens(j, 0);
  if (!found) {
    s.note = 'O endpoint respondeu, mas não foi possível encontrar um campo de tokens compatível.';
    return;
  }
  s.input = n(found.prompt_tokens ?? found.input_tokens ?? found.input);
  s.output = n(found.completion_tokens ?? found.output_tokens ?? found.output);
  s.total = n(found.total_tokens ?? found.total ?? s.input + s.output);
  s.cost = n(found.cost ?? found.total_cost ?? found.totalCost);
  const limit = n(service.limitTokens);
  if (limit > 0) s.percent = Math.min(100, s.total / limit * 100);
  s.note = 'Endpoint personalizado.';
}

function findTokens(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 4) return null;
  if (['total_tokens', 'totalTokens', 'total'].some(k => k in obj) &&
      ['prompt_tokens', 'input_tokens', 'completion_tokens', 'output_tokens', 'total_tokens', 'totalTokens'].some(k => k in obj)) return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) { const f = findTokens(item, depth + 1); if (f) return f; }
    return null;
  }
  for (const key of ['usage', 'data', 'results', 'totals', 'meta']) {
    const f = findTokens(obj[key], depth + 1);
    if (f) return f;
  }
  return null;
}

export function fmtK(v) {
  const x = n(v);
  if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
  if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
  if (x >= 1e4) return (x / 1e3).toFixed(1) + 'k';
  return Math.round(x).toLocaleString('pt-BR');
}
