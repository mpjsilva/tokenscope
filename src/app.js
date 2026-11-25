import { PROVIDERS, getProvider, MODE_LABELS } from './providers.js';
import { collectUsage, fmtK } from './usage.js';
import { requestJSON, requestRaw, nativeCall, hasNativeBridge, isNative } from './net.js';
import { load, save, uid, recordHistory } from './store.js';

const APP_VERSION = '1.9';
const UPDATE_REPO = 'mpjsilva/tokenscope';
const RELEASE_URL = `https://github.com/${UPDATE_REPO}/releases/latest`;
const state = load();
let currentTab = 'dashboard';
let refreshing = false;
let sheet = null;      // { kind, providerId, serviceId, confirm }
let refreshTimer = null;
let lastStatsJSON = '';
let amoledOn = false;
let wakeLock = null;
let shiftIndex = 0;

/* ------------------------------- ícones ---------------------------------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  network: '<rect x="9" y="2" width="6" height="5" rx="1.5"/><rect x="2" y="17" width="6" height="5" rx="1.5"/><rect x="16" y="17" width="6" height="5" rx="1.5"/><path d="M12 7v5M5 17v-3h14v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3L17 4.2 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  amoled: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 15h3m2 0h5M7 11h7"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2m-9 0 1 14h10l1-14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/>',
  upload: '<path d="M12 21V9m0 0 4 4m-4-4-4 4M4 5h16"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9m-3 0v4m-6-4v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
const logoHTML = p => p.icon
  ? `<img class="logo-img" src="${p.icon}" alt="">`
  : `<span style="font-weight:800;font-size:12px">${esc(p.initials)}</span>`;
const logoTint = p => p.logoBg
  ? `background:${p.logoBg}`
  : `background:linear-gradient(135deg,${p.color},${p.color}88)`;

/* ------------------------------- helpers -------------------------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hid = () => state.settings.hideValues;
const fmtTokens = v => hid() ? '••••' : fmtK(v);
function fmtMoney(v) {
  if (hid()) return '••••';
  const usd = Number(v) || 0;
  const val = state.settings.currency === 'BRL' ? usd * (Number(state.settings.usdBrl) || 1) : usd;
  return (state.settings.currency === 'BRL' ? 'R$ ' : 'US$ ') + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtRate(v) {
  if (v == null || v === '') return '—';
  const x = Number(v);
  if (!Number.isFinite(x)) return '—';
  if (hid()) return '•••• / 1M';
  const brl = state.settings.currency === 'BRL';
  const val = brl ? x * (Number(state.settings.usdBrl) || 1) : x;
  const digits = val > 0 && val < 0.01 ? 4 : 2;
  return (brl ? 'R$ ' : 'US$ ') +
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: digits }) + ' / 1M';
}
function maskKey(k) { k = String(k || ''); return k.length > 12 ? k.slice(0, 8) + '••••' + k.slice(-4) : (k ? '••••' + k.slice(-3) : '—'); }
function timeAgo(iso) {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const prefix = diff < 0 ? 'em ' : 'há ';
  const m = Math.round(Math.abs(diff) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${prefix}${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `${prefix}${h} h` : `${prefix}${Math.round(h / 24)} d`;
}
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function applyTheme() { document.documentElement.dataset.theme = state.settings.theme || 'dark'; }
function activeServices() { return state.services.filter(s => s.mode === 'api' && s.apiKey); }
function totalToday() {
  const today = new Date().toISOString().slice(0, 10);
  return state.history.filter(h => h.date === today).reduce((a, h) => a + (h.total || 0), 0);
}
function costToday() {
  const today = new Date().toISOString().slice(0, 10);
  return state.history.filter(h => h.date === today).reduce((a, h) => a + (h.cost || 0), 0);
}
function todayIO() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = state.history.filter(h => h.date === today);
  return {
    input: rows.reduce((a, h) => a + (h.input || 0), 0),
    output: rows.reduce((a, h) => a + (h.output || 0), 0)
  };
}

/* ---------------------------- atualizações -------------------------------- */
function versionNewer(a, b) {
  const pa = String(a || '').split('.').map(x => parseInt(x, 10) || 0);
  const pb = String(b || '').split('.').map(x => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function checkUpdate(notify = false) {
  try {
    const j = await requestJSON({
      url: `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`,
      timeout: 15000
    });
    const version = String(j.tag_name || '').replace(/^v/, '');
    const asset = (Array.isArray(j.assets) ? j.assets : []).find(a => /\.apk$/i.test(a.name || ''));
    if (versionNewer(version, APP_VERSION)) {
      state.updateInfo = {
        version,
        notes: String(j.body || '').slice(0, 700),
        url: asset?.browser_download_url || '',
        page: j.html_url || RELEASE_URL,
        at: new Date().toISOString()
      };
      if (notify) toast(`Atualização v${version} disponível!`, 'ok');
    } else {
      state.updateInfo = null;
      if (notify) toast('Você já está na versão mais recente.', 'ok');
    }
    save(state); render();
  } catch (e) {
    if (notify) toast('Não foi possível verificar: ' + (e.message || e), 'err');
  }
}

async function downloadUpdate() {
  const u = state.updateInfo;
  if (!u) return;
  if (!u.url) { window.open(u.page, '_blank'); return; }
  if (!hasNativeBridge()) { window.open(u.page, '_blank'); return; }
  toast('Baixando atualização...');
  try {
    await nativeCall('downloadAndInstall', { url: u.url, fileName: `tokenscope-v${u.version}.apk` });
    toast('Instalador aberto.', 'ok');
  } catch (e) {
    toast('Falha no download: ' + (e.message || e), 'err');
  }
}

/* ------------------------------- modelos --------------------------------- */
function modelFree(obj) {
  if (obj?.free === true) return true;
  const cost = obj?.cost || obj?.pricing || {};
  const text = cost.text || cost;
  const input = text.input?.price ?? cost.input ?? cost.prompt;
  const output = text.output?.price ?? cost.output ?? cost.completion;
  if (input != null && output != null && Number(input) === 0 && Number(output) === 0) return true;
  return /free/i.test(String(obj?.id || '')) || /free/i.test(String(obj?.name || ''));
}

function normalizeModels(j) {
  if (!j || typeof j !== 'object') return null;
  const out = [];
  const add = (id, obj = {}) => {
    if (!id) return;
    const key = String(id);
    if (out.some(m => m.id === key)) return;
    out.push({
      id: key,
      name: String(obj.name || obj.id || key),
      provider: String(obj.owned_by || obj.provider || (obj.canonical_id || '').split('/')[0] || ''),
      openSource: obj.open_weights === true || obj.openSource === true,
      free: modelFree(obj),
      cost: obj.cost || obj.pricing || null,
      description: String(obj.description || ''),
      family: String(obj.family || ''),
      limit: obj.limit || null
    });
  };
  if (Array.isArray(j.data)) for (const m of j.data) {
    if (typeof m === 'string') add(m);
    else add(m?.id || m?.name, m || {});
  }
  if (Array.isArray(j.models)) for (const m of j.models) {
    if (typeof m === 'string') add(m);
    else add(m?.id || m?.name, m || {});
  }
  if (j.models && typeof j.models === 'object' && !Array.isArray(j.models)) {
    for (const [id, m] of Object.entries(j.models)) add(id, typeof m === 'object' && m ? m : { name: id });
  }
  // Respostas agrupadas (ex.: /console/api/v1/models do OpenCode)
  for (const v of Object.values(j)) {
    if (v && typeof v === 'object' && v.models) {
      if (Array.isArray(v.models)) for (const m of v.models) add(m?.id || m?.name, m || {});
      else for (const [id, m] of Object.entries(v.models)) add(id, typeof m === 'object' && m ? m : { name: id });
    }
  }
  return out.length ? out : null;
}

const MODEL_PAGE = 20;
const shortText = s => String(s || '').slice(0, 130);

async function fetchOpenCodeModels(service) {
  // O console publica os grupos "opencode-go" (cobertos pela assinatura) e
  // "opencode". Modelos do grupo Go são considerados ativos pela assinatura,
  // sem consumir token em chamada de teste.
  const headers = service.apiKey ? { Authorization: `Bearer ${service.apiKey}` } : {};
  const j = await requestJSON({ url: getProvider(service.providerId).modelsUrl, headers, timeout: 15000 });
  const list = [];
  for (const [group, go] of [['opencode-go', true], ['opencode', false]]) {
    const ms = j?.[group]?.models || {};
    for (const [id, m] of Object.entries(ms)) {
      list.push({
        id,
        name: String(m?.name || id),
        provider: String(m?.owned_by || (m?.canonical_id || '').split('/')[0] || ''),
        openSource: m?.open_weights === true,
        free: modelFree(m),
        cost: m?.cost || null,
        description: String(m?.description || ''),
        family: String(m?.family || ''),
        limit: m?.limit || null,
        group, go
      });
    }
  }
  if (!list.length) throw new Error('O console não retornou modelos.');
  const at = new Date().toISOString();
  const old = service.modelChecks || {};
  service.available = list;
  service.modelChecks = Object.fromEntries(list.map(m => [m.id,
    m.go
      ? { ok: true, status: 200, message: 'Operacional (Go)', at }
      : (old[m.id] && !old[m.id].pending ? old[m.id] : undefined)
  ]).filter(([, v]) => v));
  service.modelsFetchedAt = at;
  service.modelsError = '';
  return list.length;
}

async function fetchModels(service, notify = true) {
  const p = getProvider(service.providerId);
  const headers = service.apiKey ? { Authorization: `Bearer ${service.apiKey}` } : {};
  if (service.providerId === 'opencode') {
    try {
      const count = await fetchOpenCodeModels(service);
      save(state); render();
      if (notify) toast(`${count} modelo(s) OpenCode carregado(s).`, 'ok');
    } catch (e) {
      service.modelsError = e.message || 'Não foi possível listar os modelos do OpenCode.';
      save(state); render();
      if (notify) toast('Falha ao listar modelos: ' + service.modelsError, 'err');
    }
    return;
  }
  const urls = [];
  if (p.modelsUrl) urls.push(p.modelsUrl);
  const base = (service.baseUrl || '').replace(/\/+$/, '');
  if (base) urls.push(`${base}/models`);
  if (!urls.length) {
    service.modelsError = 'Configure uma base URL para listar modelos.';
    save(state); render();
    return;
  }
  let list = null, lastError = null;
  for (const url of urls) {
    try {
      const found = normalizeModels(await requestJSON({ url, headers, timeout: 15000 }));
      if (found) { list = found; break; }
    } catch (e) { lastError = e; }
  }
  if (!list) {
    service.modelsError = lastError?.message || 'Não foi possível listar os modelos desta API.';
  } else {
    const checks = service.modelChecks || {};
    service.available = list.map(m => ({ id: m.id, name: m.name }));
    service.modelChecks = Object.fromEntries(
      list.map(m => [m.id, checks[m.id]]).filter(([, v]) => v)
    );
    service.modelsFetchedAt = new Date().toISOString();
    service.modelsError = '';
  }
  save(state);
  render();
  if (notify) toast(list ? `${list.length} modelo(s) carregado(s).` : 'Falha ao listar modelos.', list ? 'ok' : 'err');
}

function modelsLink(service) {
  const count = (service.available || []).length;
  const ok = Object.values(service.modelChecks || {}).filter(c => c && c.ok).length;
  return `<button class="models-link" data-act="open-models" data-id="${service.id}">
    ${icon('layers')}<span>Modelos</span><b>${count}</b>
    ${ok ? `<span class="pill ok" style="padding:2px 7px">${ok} OK</span>` : ''}${icon('chevron')}
  </button>`;
}

function openModels(serviceId) {
  const s = state.services.find(x => x.id === serviceId);
  if (!s) return;
  if (!(s.available || []).length) { fetchModels(s, true); return; }
  openSheet('models', { serviceId, limit: MODEL_PAGE, search: '' });
}

function modelData() {
  const s = state.services.find(x => x.id === sheet?.serviceId);
  const q = (sheet?.search || '').toLowerCase().trim();
  const all = s?.available || [];
  const checks = s?.modelChecks || {};
  const rank = m => {
    const c = checks[m.id];
    if (!c) return 2;
    if (c.pending) return 1;
    return c.ok ? 0 : 3;
  };
  const filtered = (q ? all.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : [...all])
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'));
  return { s, all, filtered };
}

function renderModelList() {
  if (!sheet || sheet.kind !== 'models') return;
  const { s, all, filtered } = modelData();
  const shown = filtered.slice(0, sheet.limit);
  const checks = s?.modelChecks || {};
  const el = document.getElementById('modelList');
  if (el) {
    el.innerHTML = shown.map(m => {
      const c = checks[m.id];
      const dot = !c ? '' : c.pending ? 'warn' : c.ok ? 'ok' : 'err';
      const title = !c ? 'não testado' : c.pending ? 'testando' : c.ok ? 'operacional' : shortText(c.message || 'indisponível');
      return `<button class="model-row" data-act="model-info" data-id="${s.id}" data-model="${esc(m.id)}" title="${esc(title)}">
        <span class="model-dot ${dot}"></span>
        <span class="model-row-main"><b>${esc(m.name)}</b><small class="mono">${esc(m.id)}</small></span>
        ${m.free ? '<span class="model-free">Grátis</span>' : ''}
        ${icon('chevron')}
      </button>`;
    }).join('') || '<div class="empty" style="padding:20px">Nenhum modelo encontrado.</div>';
  }
  const foot = document.getElementById('modelFoot');
  if (foot) {
    if (shown.length < filtered.length) {
      foot.innerHTML = `<div class="models-progress">${shown.length} de ${filtered.length} modelos · role para ver mais <span class="spin"></span></div>`;
    } else {
      foot.innerHTML = `<div class="models-end">${icon('check')} Fim da lista · ${filtered.length} modelo(s)${filtered.length !== all.length ? ` de ${all.length}` : ''}</div>`;
    }
  }
  const counter = document.getElementById('modelCounter');
  if (counter) counter.textContent = `${filtered.length} modelo(s)`;
}

async function testOneModel(service, m) {
  const at = new Date().toISOString();
  const p = getProvider(service.providerId);
  const base = (service.baseUrl || '').replace(/\/+$/, '');
  const url = p.chatUrl || (base ? `${base}/chat/completions` : '');
  if (!url) return { ok: false, status: 0, message: 'Base URL não configurada', at };
  const headers = { 'Content-Type': 'application/json' };
  if (service.apiKey) headers.Authorization = `Bearer ${service.apiKey}`;
  try {
    const r = await requestRaw({
      url, method: 'POST', headers,
      body: { model: m.id, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
      timeout: 30000
    });
    let message = '';
    try {
      const j = JSON.parse(r.body);
      message = j?.error?.message || j?.message || '';
    } catch { message = shortText(r.body); }
    const ok = r.status >= 200 && r.status < 300;
    return { ok, status: r.status, message: ok ? 'Operacional' : (message || `HTTP ${r.status}`), at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, status: 0, message: e.message || 'Falha de rede', at: new Date().toISOString() };
  }
}

async function testAllModels(service) {
  const models = service.available || [];
  if (!models.length) { toast('Nenhum modelo para testar.', 'err'); return; }
  if (service.providerId === 'opencode') {
    // Para a assinatura OpenCode, a fonte de verdade é o grupo opencode-go do
    // console — não uma chamada de chat (que cobra saldo/balance).
    service.modelChecks = Object.fromEntries(
      models.map(m => [m.id, { pending: true, at: new Date().toISOString() }])
    );
    save(state); renderModelList();
    try {
      await fetchOpenCodeModels(service);
      save(state); renderModelList();
      const go = (service.available || []).filter(m => m.go).length;
      toast(`${go} modelo(s) Go ativo(s) pela assinatura.`, 'ok');
    } catch (e) {
      toast('Falha ao atualizar modelos: ' + (e.message || e), 'err');
    }
    return;
  }
  service.modelChecks = service.modelChecks || {};
  for (const m of models) service.modelChecks[m.id] = { pending: true, at: new Date().toISOString() };
  save(state);
  renderModelList();
  const queue = [...models];
  let ok = 0, fail = 0;
  const worker = async () => {
    while (queue.length) {
      const m = queue.shift();
      const result = await testOneModel(service, m);
      service.modelChecks[m.id] = result;
      result.ok ? ok++ : fail++;
      save(state);
      if (sheet?.kind === 'models' && sheet.serviceId === service.id) renderModelList();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  toast(`${ok} operacional(is) · ${fail} indisponível(is)`, fail ? 'err' : 'ok');
}

async function fetchRate(notify = true) {
  try {
    const j = await requestJSON({ url: 'https://open.er-api.com/v6/latest/USD', timeout: 15000 });
    if (j?.result !== 'success' || !j?.rates?.BRL) throw new Error('Cotação indisponível.');
    state.settings.usdBrl = Number(Number(j.rates.BRL).toFixed(4));
    state.settings.rateAt = j.time_last_update_utc || new Date().toISOString();
    save(state);
    if (currentTab === 'settings') render();
    if (notify) toast(`USD → BRL ${state.settings.usdBrl.toFixed(4)}`, 'ok');
  } catch (e) {
    if (notify) toast('Não foi possível buscar a cotação: ' + (e.message || e), 'err');
  }
}

function limitBarsHTML(snap) {
  const rows = (snap.breakdown || []).filter(b => b.pct != null);
  if (!rows.length) return '';
  return `<div class="limit-bars">${rows.map(b => {
    const pct = Math.round(b.pct || 0);
    const cls = pct >= 100 ? 'err' : pct >= 75 ? 'warn' : '';
    return `<div class="limit-row">
      <span class="limit-name">${esc(b.label)}</span>
      <div class="bar ${cls}"><i style="width:${Math.min(100, pct)}%"></i></div>
      <b class="limit-pct">${pct}%</b>
    </div>
    ${b.resetAt ? `<div class="limit-reset">reseta ${esc(timeAgo(b.resetAt))}</div>` : ''}`;
  }).join('')}</div>`;
}

/* --------------------------------- views -------------------------------- */
function viewDashboard() {
  const cost = costToday();
  const limitTop = state.services.reduce((acc, s) => {
    const snap = s.snapshot || {};
    const pct = Number(snap.percent) || 0;
    return pct > acc.pct ? { pct, label: s.label || getProvider(s.providerId).name } : acc;
  }, { pct: 0, label: '—' });
  const withLimits = state.services.filter(s => Number(s.snapshot?.percent) > 0).length;

  const cards = state.services.map(s => {
    const p = getProvider(s.providerId);
    const snap = s.snapshot || {};
    const pct = Number(snap.percent) || 0;
    const pctRows = (snap.breakdown || []).filter(b => b.pct != null);
    const barClass = pct >= 100 ? 'err' : pct >= 75 ? 'warn' : '';
    const status = snap.ok === false ? 'err' : (snap.ok === true && snap.lastSync ? 'ok' : '');
    const statusText = snap.ok === false ? 'erro' : (snap.lastSync ? 'atualizado' : 'aguardando');
    return `<article class="card svc-card" data-act="open-models" data-id="${s.id}">
      <div class="svc-head">
        <div class="svc-logo" style="${logoTint(p)}">${logoHTML(p)}</div>
        <div style="flex:1;min-width:0">
          <div class="svc-name">${esc(s.label || p.name)}</div>
          <div class="svc-meta">${esc(p.name)} · ${esc(MODE_LABELS[s.mode] || s.mode)} · ${esc(maskKey(s.apiKey))}</div>
        </div>
        <span class="pill ${status}"><span class="dot"></span>${statusText}</span>
      </div>
      <div class="svc-body">
        <div><div class="mini-label">Custo estimado</div><div class="big-num" style="font-size:18px">${fmtMoney(snap.cost || 0)}</div></div>
        <div style="text-align:right"><div class="mini-label">Limite</div><div class="big-num" style="font-size:18px">${Math.round(pct)}%</div></div>
      </div>
      ${pctRows.length ? limitBarsHTML(snap) : (pct > 0 || snap.resetAt ? `
      <div>
        <div class="bar-row"><span>Uso do limite</span><span>${Math.round(pct)}%${snap.resetAt ? ' · reseta ' + esc(timeAgo(snap.resetAt)) : ''}</span></div>
        <div class="bar ${barClass}"><i style="width:${Math.min(100, pct)}%"></i></div>
      </div>` : '')}
      ${!pctRows.length && snap.breakdown?.length ? `<div class="breakdown">${snap.breakdown.slice(0, 4).map(b =>
        `<div class="bd-row"><span>${esc(b.label || '')}</span><b>${esc(b.value ?? '')}</b></div>`).join('')}</div>` : ''}
      ${modelsLink(s)}
      ${snap.note ? `<div class="note ${snap.ok === false ? 'warn' : ''}">${esc(snap.note)}</div>` : ''}
      <div class="btn-row">
        <button class="btn sm" data-act="test-service" data-id="${s.id}">${icon('refresh')} Atualizar</button>
        <button class="btn sm ghost" data-act="edit-service" data-id="${s.id}">${icon('edit')} Editar</button>
        ${s.mode === 'proxy' ? `<button class="btn sm ghost" data-act="goto-proxy">${icon('network')} Proxy</button>` : ''}
      </div>
      <div style="font-size:10px;color:var(--muted-2)">Atualizado ${esc(timeAgo(snap.lastSync))}</div>
    </article>`;
  }).join('');

  return `
    <section class="card hero">
      <div class="hero-top">
        <div><div class="hero-label">Limite em uso</div><div class="hero-value">${Math.round(limitTop.pct)}% <small>de ${esc(limitTop.label)}</small></div></div>
        <span class="pill"><span class="dot" style="background:var(--accent-2)"></span>${state.services.length} provedor(es)</span>
      </div>
      <div class="hero-sub">${fmtMoney(cost)} estimados hoje · atualizado ${esc(timeAgo(state.lastRefresh))}</div>
      <div class="metrics">
        <div class="metric"><div class="k">Custo estimado</div><div class="v">${fmtMoney(cost)}</div></div>
        <div class="metric"><div class="k">Limites monitorados</div><div class="v">${withLimits}</div></div>
      </div>
    </section>
    ${state.updateInfo ? `<button class="update-banner" data-act="update-info">
      ${icon('download')}<span>Atualização v${esc(state.updateInfo.version)} disponível</span>${icon('chevron')}
    </button>` : ''}
    <div class="section-title"><span>Meus provedores</span><button class="link" data-act="add-service">+ adicionar</button></div>
    ${cards || `<div class="card empty"><div class="empty-ico">${icon('layers')}</div><h3>Nenhum provedor conectado</h3><p>Adicione uma API key para acompanhar tokens, limites e custo em um só lugar.</p><button class="btn primary" data-act="add-service">${icon('plus')} Adicionar provedor</button></div>`}
  `;
}

function viewServices() {
  const items = state.services.map(s => {
    const p = getProvider(s.providerId);
    return `<article class="card svc-card" style="margin-bottom:9px;padding:13px" data-act="open-models" data-id="${s.id}">
      <div class="svc-head">
        <div class="svc-logo" style="width:34px;height:34px;border-radius:10px;${logoTint(p)}">${logoHTML(p)}</div>
        <div style="flex:1;min-width:0"><div class="svc-name">${esc(s.label || p.name)}</div>
          <div class="svc-meta">${esc(p.name)} · ${esc(MODE_LABELS[s.mode] || s.mode)} · ${esc(maskKey(s.apiKey))}</div></div>
      </div>
      ${modelsLink(s)}
      <div class="btn-row">
        <button class="btn sm" data-act="test-service" data-id="${s.id}">${icon('refresh')} Atualizar</button>
        <button class="btn sm ghost" data-act="edit-service" data-id="${s.id}">${icon('edit')} Editar</button>
        ${s.mode === 'proxy' ? `<button class="btn sm ghost" data-act="toggle-proxy" data-id="${s.id}">${icon('play')} Proxy</button>` : ''}
        <button class="btn sm danger" data-act="delete-service" data-id="${s.id}">${icon('trash')}</button>
      </div></article>`;
  }).join('');

  const templates = PROVIDERS.map(p => `
    <button class="tpl" data-act="pick-provider" data-id="${p.id}">
      <div class="tpl-top"><div class="tpl-logo" style="${logoTint(p)}">${logoHTML(p)}</div>
        <div><div class="tpl-name">${esc(p.name)}</div><div class="tpl-cat">${esc(p.category)}</div></div></div>
      <div class="tpl-desc">${esc(p.desc)}</div>
      <div><span class="tag">${p.modes.map(m => MODE_LABELS[m]).join(' · ')}</span></div>
    </button>`).join('');

  return `
    <div class="section-title"><span>Conectados (${state.services.length})</span><button class="link" data-act="add-service">+ novo</button></div>
    ${items || `<div class="card empty"><div class="empty-ico">${icon('key')}</div><h3>Comece com uma chave de API</h3><p>Escolha um provedor abaixo. Suas chaves ficam salvas apenas neste dispositivo.</p></div>`}
    <div class="section-title"><span>Adicionar provedor</span></div>
    <div class="tpl-grid">${templates}</div>
    <div class="note" style="margin-top:14px">Provedores sem endpoint público de uso (Claude, Groq, Together, Gemini, Anthropic) são monitorados pelo <b>proxy local</b>, que lê o campo <span class="mono">usage</span> de cada resposta OpenAI-compatible.</div>
  `;
}

function proxyRule(service) {
  return {
    id: service.id,
    port: Number(service.proxyPort) || 0,
    upstream: (service.baseUrl || '').replace(/\/+$/, ''),
    apiKey: service.apiKey || ''
  };
}
function proxyServices() { return state.services.filter(s => s.mode === 'proxy' && s.baseUrl); }

function viewProxy() {
  const native = hasNativeBridge();
  const services = proxyServices();
  const rows = services.map((s, i) => {
    const p = getProvider(s.providerId);
    const port = Number(s.proxyPort) || 8080 + i;
    const url = `http://127.0.0.1:${port}`;
    const running = !!s.proxyRunning;
    const st = s.proxyStats || {};
    return `<article class="card svc-card" style="margin-bottom:10px">
      <div class="svc-head">
        <div class="svc-logo" style="width:34px;height:34px;border-radius:10px;${logoTint(p)}">${logoHTML(p)}</div>
        <div style="flex:1;min-width:0"><div class="svc-name">${esc(s.label || p.name)}</div>
          <div class="svc-meta mono">${esc((s.baseUrl || '').replace(/^https?:\/\//, ''))}</div></div>
        <span class="pill ${running ? 'ok' : ''}"><span class="dot"></span>${running ? 'ativo' : 'parado'}</span>
      </div>
      <div class="copy-box"><code>${esc(url)}</code><button class="btn sm ghost" data-act="copy" data-text="${esc(url)}">${icon('copy')}</button></div>
      <div class="metrics" style="margin-top:10px">
        <div class="metric"><div class="k">Requisições</div><div class="v">${fmtTokens(st.requests || 0)}</div></div>
        <div class="metric"><div class="k">Tokens contados</div><div class="v">${fmtTokens(st.total || 0)}</div></div>
      </div>
      <div style="font-size:10.5px;color:var(--muted);display:flex;justify-content:space-between">
        <span>entrada ${fmtTokens(st.input || 0)} · saída ${fmtTokens(st.output || 0)}</span>
        <span>${esc(timeAgo(st.lastAt))}</span>
      </div>
      <div class="btn-row">
        <button class="btn sm ${running ? '' : 'primary'}" data-act="toggle-proxy" data-id="${s.id}" ${native ? '' : 'disabled'}>${icon(running ? 'stop' : 'play')} ${running ? 'Parar' : 'Iniciar'}</button>
        <button class="btn sm ghost" data-act="clear-proxy" data-id="${s.id}">${icon('trash')} Zerar</button>
      </div>
    </article>`;
  }).join('');

  return `
    <div class="card hero">
      <div class="hero-top"><div><div class="hero-label">Proxy local OpenAI-compatible</div>
        <div class="hero-value" style="font-size:22px">${native ? 'Disponível no Android' : 'Modo navegador'}</div></div>
        <span class="pill ${native ? 'ok' : 'warn'}"><span class="dot"></span>${native ? 'nativo' : 'limitado'}</span></div>
      <div class="hero-sub">O proxy recebe chamadas no celular, repassa ao provedor e registra os tokens de cada resposta.</div>
    </div>
    <div class="note" style="margin-top:14px"><b>Como usar:</b> no app/cliente de IA, troque a Base URL pelo endereço acima (ex.: <span class="mono">http://127.0.0.1:8080</span>) e mantenha a chave original. O proxy encaminha <span class="mono">/chat/completions</span> para a base URL configurada.</div>
    <div class="section-title"><span>Regras ativas</span><button class="link" data-act="add-service">+ provedor</button></div>
    ${rows || `<div class="card empty"><div class="empty-ico">${icon('network')}</div><h3>Nenhum proxy configurado</h3><p>Adicione um provedor no modo Proxy para começar a contar tokens em tempo real.</p><button class="btn primary" data-act="add-service">${icon('plus')} Adicionar</button></div>`}
    ${!native ? `<div class="note warn" style="margin-top:12px">No navegador o proxy não pode escutar portas. Instale o APK no Android para usar esta função.</div>` : ''}
  `;
}

function viewSettings() {
  const s = state.settings;
  return `
    <div class="section-title"><span>Aparência</span></div>
    <section class="card">
      <div class="switch-row"><div><div class="t">Tema</div><div class="d">Escolha o tema do app</div></div>
        <div class="segment" style="width:180px">
          <button data-act="set-theme" data-v="dark" class="${s.theme === 'dark' ? 'on' : ''}">Escuro</button>
          <button data-act="set-theme" data-v="light" class="${s.theme === 'light' ? 'on' : ''}">Claro</button>
        </div></div>
      <div class="switch-row"><div><div class="t">Ocultar valores</div><div class="d">Esconde tokens e custos na tela</div></div>
        <div class="switch ${s.hideValues ? 'on' : ''}" data-act="toggle-setting" data-key="hideValues"></div></div>
    </section>
    <div class="section-title"><span>Atualização e custo</span></div>
    <section class="card">
      <div class="field"><label>Atualizar automaticamente a cada</label>
        <select data-setting="refreshMinutes">
          ${[5, 10, 15, 30, 60, 0].map(v => `<option value="${v}" ${s.refreshMinutes === v ? 'selected' : ''}>${v === 0 ? 'Desativado' : v + ' minutos'}</option>`).join('')}
        </select></div>
      <div class="field"><label>Moeda</label>
        <div class="segment"><button data-act="set-currency" data-v="USD" class="${s.currency === 'USD' ? 'on' : ''}">USD</button><button data-act="set-currency" data-v="BRL" class="${s.currency === 'BRL' ? 'on' : ''}">BRL (R$)</button></div></div>
      <div class="field"><label>Cotação USD → BRL</label>
        <input type="number" step="0.0001" data-setting="usdBrl" value="${esc(s.usdBrl)}">
        <div class="hint">${s.rateAt ? `Última busca: ${esc(s.rateAt)}` : 'Buscada na API livre open.er-api.com (atualização diária).'}</div>
        <div class="rate-row">
          <button class="btn sm" data-act="fetch-rate">${icon('refresh')} Buscar cotação de hoje</button>
          <div class="rate-auto"><span>Buscar ao abrir</span>
            <div class="switch ${s.autoRate ? 'on' : ''}" data-act="toggle-setting" data-key="autoRate" title="Atualizar automaticamente"></div>
          </div>
        </div>
      </div>
    </section>
    <div class="section-title"><span>Atualização</span></div>
    <section class="card">
      <div class="switch-row"><div><div class="t">Versão instalada</div><div class="d">v${APP_VERSION} · releases do GitHub</div></div>
        <button class="btn sm" data-act="check-update">${icon('refresh')} Verificar</button></div>
      ${state.updateInfo ? `<div class="update-banner" style="margin-top:10px" data-act="update-info">
        ${icon('download')}<span>Nova versão v${esc(state.updateInfo.version)}</span>${icon('chevron')}</div>` : ''}
    </section>
    <div class="section-title"><span>Dados</span></div>
    <section class="card">
      <div class="btn-row"><button class="btn" data-act="export">${icon('download')} Exportar JSON</button><button class="btn" data-act="import">${icon('upload')} Importar</button></div>
      <div class="note" style="margin-top:12px">Chaves e dados ficam somente neste dispositivo. Use chaves com permissão mínima e prazo de expiração. Nada é enviado a terceiros além das chamadas diretas às APIs.</div>
    </section>
    <div class="section-title"><span>Sobre</span></div>
    <section class="card" style="text-align:center">
      <img src="src/icons/tokenscope-brand.png" alt="TokenScope" style="height:104px;max-width:100%;object-fit:contain;display:block;margin:0 auto 12px">
      <div style="font-weight:750;text-align:left">TokenScope v${APP_VERSION}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:5px;text-align:left">Monitora provedores de IA e seus gastos em limites e tokens: OpenCode, OpenRouter, OpenAI, Anthropic, Claude, Groq, Together, DeepSeek, Gemini e APIs OpenAI-compatible.</div>
      <div style="font-size:11px;color:var(--muted-2);margin-top:10px;text-align:left">Feito por mpjsliva usando Hy4 flash · Plataforma: ${esc(isNative() ? 'Android (Capacitor)' : 'Navegador')}</div>
    </section>`;
}

/* --------------------------- modo AMOLED --------------------------------- */
function amoledRowsHTML() {
  return state.services.map(s => {
    const p = getProvider(s.providerId);
    const snap = s.snapshot || {};
    const pct = Math.round(snap.percent || 0);
    return `<div class="am-row">
      <div class="am-row-top"><span class="am-logo" style="color:${p.color}">${logoHTML(p)}</span>
        <span class="am-name">${esc(s.label || p.name)}</span><span class="am-pct">${pct}%</span></div>
      <div class="am-bar"><i style="width:${Math.min(100, pct)}%;background:${p.color}"></i></div>
      <div class="am-row-foot"><span>${snap.note ? esc(shortText(snap.note)) : esc(MODE_LABELS[s.mode] || '')}</span>
        <span>${snap.resetAt ? 'reseta ' + esc(timeAgo(snap.resetAt)) : ''}</span></div>
    </div>`;
  }).join('') || '<div class="am-empty">Nenhum provedor conectado</div>';
}

function viewAmoled() {
  const now = new Date();
  return `<div class="amoled-screen" id="amoledScreen">
    <div>
      <div class="am-clock" id="amClock">${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="am-date" id="amDate">${now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}</div>
    </div>
    <div class="am-hero">
      <div><div class="am-k">Limite em uso</div><div class="am-big" id="amLimit">${Math.round(state.services.reduce((a, s) => Math.max(a, Number(s.snapshot?.percent) || 0), 0))}%</div></div>
      <div><div class="am-k">Custo hoje</div><div class="am-big" id="amCost">${fmtMoney(costToday())}</div></div>
    </div>
    <div class="am-section">PROVEDORES EM TEMPO REAL</div>
    <div class="am-rows" id="amRows">${amoledRowsHTML()}</div>
  </div>`;
}

function tickAmoled() {
  if (!amoledOn || currentTab !== 'amoled') return;
  const now = new Date();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  };
  set('amClock', now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  set('amDate', now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase());
  set('amLimit', Math.round(state.services.reduce((a, s) => Math.max(a, Number(s.snapshot?.percent) || 0), 0)) + '%');
  set('amCost', fmtMoney(costToday()));
  const rows = document.getElementById('amRows');
  if (rows) rows.innerHTML = amoledRowsHTML();
}

function shiftAmoled() {
  if (!amoledOn || currentTab !== 'amoled') return;
  const shifts = [[0, 0], [3, 0], [6, 3], [3, 6], [0, 3], [-3, 0]];
  shiftIndex = (shiftIndex + 1) % shifts.length;
  const el = document.getElementById('amoledScreen');
  if (el) el.style.transform = `translate(${shifts[shiftIndex][0]}px, ${shifts[shiftIndex][1]}px)`;
}

async function amoledNative(on) {
  if (!hasNativeBridge()) return;
  try {
    await nativeCall('keepAwake', { enabled: on });
    await nativeCall('setBrightness', { value: on ? 0.22 : -1 });
  } catch { /* bridge indisponível */ }
}

async function lockScreen(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* Wake Lock não suportado */ }
}

async function enterAmoled() {
  amoledOn = true;
  document.body.classList.add('amoled');
  currentTab = 'amoled';
  render();
  await amoledNative(true);
  await lockScreen(true);
  refreshAll(true);
  getStats(true);
}

async function exitAmoled(goDashboard = true) {
  amoledOn = false;
  document.body.classList.remove('amoled');
  const el = document.getElementById('amoledScreen');
  if (el) el.style.transform = '';
  await amoledNative(false);
  await lockScreen(false);
  if (goDashboard) { currentTab = 'dashboard'; render(); }
}

const VIEWS = { dashboard: viewDashboard, services: viewServices, amoled: viewAmoled, proxy: viewProxy, settings: viewSettings };

function render() {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
  $('#view').innerHTML = VIEWS[currentTab]();
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  $('#btnTheme').innerHTML = icon(state.settings.theme === 'dark' ? 'sun' : 'moon');
  $('#btnRefresh').innerHTML = icon('refresh');
  $('#sheetClose').innerHTML = icon('close');
  $('#brandSub').textContent = state.services.length
    ? `${state.services.length} provedor(s) monitorado(s)`
    : 'Use seus provedores sob controle';
}

/* --------------------------------- sheets -------------------------------- */
function openSheet(kind, opts = {}) {
  sheet = { kind, ...opts };
  $('#sheet').classList.remove('hidden');
  $('#sheet').setAttribute('aria-hidden', 'false');
  renderSheet();
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheet').setAttribute('aria-hidden', 'true');
  sheet = null;
}
function renderSheet() {
  if (!sheet) return;
  const body = $('#sheetBody');
  const title = $('#sheetTitle');
  if (sheet.kind === 'picker') {
    title.textContent = 'Adicionar provedor';
    body.innerHTML = PROVIDERS.map(p => `
      <button class="btn block" data-act="pick-provider" data-id="${p.id}" style="justify-content:flex-start;margin-bottom:8px">
        <span class="tpl-logo" style="${logoTint(p)}">${logoHTML(p)}</span>
        <span style="text-align:left;flex:1"><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${esc(p.category)}</small></span>
        ${icon('plus')}</button>`).join('');
    return;
  }
  if (sheet.kind === 'confirm') {
    title.textContent = sheet.title || 'Confirmar';
    body.innerHTML = `<p style="font-size:13px;color:var(--muted);margin-bottom:18px">${esc(sheet.text || '')}</p>
      <div class="btn-row"><button class="btn primary" data-act="confirm-yes">Confirmar</button><button class="btn ghost" data-act="close-sheet">Cancelar</button></div>`;
    return;
  }
  if (sheet.kind === 'update') {
    const u = state.updateInfo;
    title.textContent = 'Atualização v' + (u?.version || '');
    body.innerHTML = `
      <div class="note">Versão instalada: v${APP_VERSION} · Nova versão: v${esc(u?.version || '')}. Baixe direto pelo app no Android ou abra a página da release.</div>
      ${u?.notes ? `<div class="note" style="margin-top:10px;white-space:pre-wrap">${esc(u.notes)}</div>` : ''}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn primary" data-act="download-update">${icon('download')} Baixar e instalar</button>
        <button class="btn ghost" data-act="open-release">${icon('external')} GitHub</button>
      </div>`;
    return;
  }
  if (sheet.kind === 'modelInfo') {
    const s = state.services.find(x => x.id === sheet.serviceId);
    const m = s?.available?.find(x => x.id === sheet.modelId);
    if (!m) { title.textContent = 'Modelo'; body.innerHTML = '<div class="empty">Modelo não encontrado.</div>'; return; }
    const c = s?.modelChecks?.[m.id];
    title.textContent = m.name;
    const cost = m.cost || {};
    const text = cost.text || cost;
    const priceIn = text?.input?.price ?? cost.input ?? cost.prompt ?? null;
    const priceOut = text?.output?.price ?? cost.output ?? cost.completion ?? null;
    const cacheRead = text?.input?.cache?.read ?? null;
    const dot = !c ? '' : c.pending ? 'warn' : c.ok ? 'ok' : 'err';
    const status = !c ? 'Não testado' : c.pending ? 'Testando' : c.ok ? 'Operacional' : 'Indisponível';
    body.innerHTML = `
      <div class="model-info-head">
        <span class="model-dot ${dot}" style="width:12px;height:12px"></span>
        <div><div style="font-weight:750">${esc(m.name)}</div><div class="mono" style="color:var(--muted);margin-top:3px">${esc(m.id)}</div></div>
      </div>
      <div class="model-info-grid">
        <div><span class="mini-label">Status</span><b>${esc(status)}</b></div>
        <div><span class="mini-label">Fornecedor</span><b>${esc(m.provider || '—')}</b></div>
        <div><span class="mini-label">Open source</span><b style="color:${m.openSource ? 'var(--ok)' : 'var(--muted)'}">${m.openSource ? 'Sim' : 'Não'}</b></div>
        <div><span class="mini-label">Gratuito</span><b style="color:${m.free ? 'var(--ok)' : 'var(--muted)'}">${m.free ? 'Sim' : 'Não'}</b></div>
        <div><span class="mini-label">Família</span><b>${esc(m.family || '—')}</b></div>
        <div><span class="mini-label">Entrada / 1M</span><b>${esc(fmtRate(priceIn))}</b></div>
        <div><span class="mini-label">Saída / 1M</span><b>${esc(fmtRate(priceOut))}</b></div>
        <div><span class="mini-label">Cache leitura / 1M</span><b>${esc(fmtRate(cacheRead))}</b></div>
        <div><span class="mini-label">Contexto</span><b>${esc(m.limit?.context ? fmtK(m.limit.context) + ' tokens' : '—')}</b></div>
      </div>
      ${m.description ? `<div class="note" style="margin-top:14px">${esc(m.description)}</div>` : ''}
      ${s?.label ? `<div style="font-size:11px;color:var(--muted-2);margin-top:12px">Provedor: ${esc(s.label)}</div>` : ''}`;
    return;
  }
  if (sheet.kind === 'models') {
    const s = state.services.find(x => x.id === sheet.serviceId);
    const p = getProvider(s?.providerId);
    title.textContent = 'Modelos · ' + (s?.label || p?.name || '');
    body.innerHTML = `
      <div class="models-toolbar">
        <input id="modelSearch" type="search" placeholder="Buscar modelo..." value="${esc(sheet.search || '')}">
        <button class="btn sm" data-act="reload-models-sheet">${icon('refresh')} Atualizar</button>
      </div>
      <div id="modelCounter" class="section-title" style="margin:14px 2px 6px"></div>
      <div id="modelList" class="model-list"></div>
      <div id="modelFoot" class="model-foot"></div>`;
    renderModelList();
    const input = document.getElementById('modelSearch');
    if (input) input.addEventListener('input', e => {
      sheet.search = e.target.value;
      sheet.limit = MODEL_PAGE;
      renderModelList();
    });
    // Carrega o próximo bloco conforme a rolagem chega perto do fim.
    const scroller = document.getElementById('sheetBody');
    if (scroller) scroller.onscroll = () => {
      if (sheet?.kind !== 'models') return;
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 180) {
        const { filtered } = modelData();
        if (sheet.limit < filtered.length) {
          sheet.limit = Math.min(filtered.length, sheet.limit + MODEL_PAGE);
          renderModelList();
        }
      }
    };
    return;
  }
  if (sheet.kind === 'form') {
    const p = getProvider(sheet.providerId);
    const existing = sheet.serviceId ? state.services.find(s => s.id === sheet.serviceId) : null;
    const v = sheet.values || existing || {};
    title.textContent = existing ? 'Editar ' + p.name : 'Novo ' + p.name;
    const modes = p.modes.length > 1 ? `<div class="field"><label>Modo de coleta</label><div class="segment">
        ${p.modes.map(m => `<button data-act="set-mode" data-v="${m}" class="${(v.mode || p.modes[0]) === m ? 'on' : ''}">${MODE_LABELS[m]}</button>`).join('')}
      </div><div class="hint">${p.modes.includes('api') ? 'API: consulta histórico diretamente. ' : ''}${p.modes.includes('proxy') ? 'Proxy: conta tokens em cada chamada.' : ''}</div></div>` : '';
    const fields = p.fields.map(f => {
      const val = v[f.key] ?? f.default ?? '';
      if (f.type === 'number') return `<div class="field"><label>${esc(f.label)}</label><input type="number" data-field="${f.key}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}">${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
      return `<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label><input type="${f.type || 'text'}" data-field="${f.key}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" spellcheck="false">${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    }).join('');
    body.innerHTML = `
      ${modes}
      ${fields}
      <div class="field"><label>Nome personalizado (opcional)</label><input type="text" data-field="label" value="${esc(v.label || '')}" placeholder="${esc(p.name)}"></div>
      ${sheet.missing ? `<div class="note warn">Preencha os campos obrigatórios.</div>` : ''}
      ${v.id ? `<div class="field"><label>Porta do proxy</label><input type="number" data-field="proxyPort" value="${esc(v.proxyPort || 8080 + state.services.length)}"></div>` : ''}
      <div class="btn-row" style="margin-top:18px">
        <button class="btn primary" data-act="save-service">${icon('check')} Salvar</button>
        <button class="btn ghost" data-act="close-sheet">Cancelar</button>
      </div>
      ${p.keyUrl ? `<a class="btn ghost block" style="margin-top:10px" href="${esc(p.keyUrl)}" target="_blank" rel="noopener">${icon('external')} Obter chave em ${esc(p.name)}</a>` : ''}
      ${p.hint ? `<div class="note" style="margin-top:12px">${esc(p.hint)}</div>` : ''}`;
    return;
  }
}

function collectForm() {
  const values = {};
  document.querySelectorAll('#sheetBody [data-field]').forEach(el => { values[el.dataset.field] = el.value.trim(); });
  return values;
}

/* --------------------------------- ações --------------------------------- */
async function refreshAll(silent = false) {
  if (refreshing) return;
  const targets = activeServices();
  if (!targets.length) { if (!silent) toast('Adicione um provedor com API key primeiro.'); return; }
  refreshing = true;
  $('#btnRefresh').innerHTML = `<span class="spin"></span>`;
  let ok = 0, fail = 0;
  await Promise.all(targets.map(async s => {
    const prev = s.snapshot;
    const snap = await collectUsage(s, requestJSON);
    snap.lastSync = new Date().toISOString();
    if (snap.ok === false && prev) {
      s.snapshot = { ...prev, ok: false, note: snap.note, lastSync: snap.lastSync };
    } else {
      s.snapshot = snap;
    }
    if (snap.ok !== false) { recordHistory(state, s, snap); ok++; } else fail++;
  }));
  state.lastRefresh = new Date().toISOString();
  save(state);
  refreshing = false;
  render();
  toast(`${ok} provedor(s) atualizado(s)${fail ? ` · ${fail} falha(s)` : ''}`, fail ? 'err' : 'ok');
}

async function testService(id) {
  const s = state.services.find(x => x.id === id);
  if (!s) return;
  toast(`Consultando ${s.label || getProvider(s.providerId).name}...`);
  if (s.mode === 'proxy') {
    const stats = await getStats(true);
    const st = stats[id] || {};
    toast(`Proxy: ${st.requests || 0} chamadas, ${fmtK(st.total || 0)} tokens`, st.requests ? 'ok' : '');
    return;
  }
  const prev = s.snapshot;
  const snap = await collectUsage(s, requestJSON);
  snap.lastSync = new Date().toISOString();
  if (snap.ok === false && prev) {
    s.snapshot = { ...prev, ok: false, note: snap.note, lastSync: snap.lastSync };
  } else {
    s.snapshot = snap;
  }
  if (snap.ok !== false) recordHistory(state, s, snap);
  save(state); render();
  toast(snap.ok === false ? `Erro: ${snap.note}` : `${fmtK(snap.total)} tokens · ${fmtMoney(snap.cost)}`, snap.ok === false ? 'err' : 'ok');
}

async function getStats(force = false) {
  if (!hasNativeBridge()) return {};
  try {
    const r = await nativeCall('getStats');
    lastStatsJSON = JSON.stringify(r.stats || {});
    for (const s of state.services) {
      const st = (r.stats || {})[s.id];
      if (st) { s.proxyStats = st; s.proxyRunning = !!(r.running || {})[s.id]; }
    }
    if (!force) { save(state); render(); }
    return r.stats || {};
  } catch { return {}; }
}

async function toggleProxy(id) {
  const s = state.services.find(x => x.id === id);
  if (!s || s.mode !== 'proxy') return;
  if (!s.baseUrl) { toast('Configure a base URL antes de iniciar.'); return; }
  const native = hasNativeBridge();
  if (!native) { toast('O proxy requer o app Android.', 'err'); return; }
  try {
    if (s.proxyRunning) {
      await nativeCall('stopProxy', { id: s.id });
      s.proxyRunning = false;
      toast('Proxy parado.');
    } else {
      const i = state.services.findIndex(x => x.id === id);
      const rule = proxyRule(s);
      rule.port = Number(s.proxyPort) || 8080 + i;
      await nativeCall('startProxy', rule);
      s.proxyPort = rule.port; s.proxyRunning = true;
      toast(`Proxy ativo em 127.0.0.1:${rule.port}`, 'ok');
    }
    save(state); render();
  } catch (e) { toast('Falha no proxy: ' + (e.message || e), 'err'); }
}

async function clearProxy(id) {
  try { await nativeCall('clearStats', { id }); await getStats(true); toast('Contadores zerados.'); }
  catch (e) { toast(e.message || 'Falha ao zerar.', 'err'); }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tokenscope-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Backup exportado.', 'ok');
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.services)) throw new Error('Arquivo inválido.');
      Object.assign(state, data);
      state.settings = { ...state.settings, ...(data.settings || {}) };
      save(state); applyTheme(); setupRefresh(); render();
      toast('Backup importado.', 'ok');
    } catch (e) { toast('Importação falhou: ' + e.message, 'err'); }
  };
  input.click();
}

function setupRefresh() {
  clearInterval(refreshTimer);
  const min = Number(state.settings.refreshMinutes) || 0;
  if (min > 0) refreshTimer = setInterval(() => refreshAll(true), min * 60000);
}

/* ------------------------------- eventos --------------------------------- */
document.addEventListener('click', async e => {
  const nav = e.target.closest('.nav-item');
  if (nav) {
    const target = nav.dataset.tab;
    if (target === 'amoled') { if (!amoledOn) await enterAmoled(); return; }
    if (amoledOn) await exitAmoled(false);
    currentTab = target;
    render();
    return;
  }

  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.dataset;
  switch (a.act) {
    case 'add-service': openSheet('picker'); break;
    case 'pick-provider': openSheet('form', { providerId: a.id, values: { mode: getProvider(a.id).modes[0] } }); break;
    case 'edit-service': openSheet('form', { providerId: state.services.find(s => s.id === a.id)?.providerId, serviceId: a.id }); break;
    case 'close-sheet': closeSheet(); break;
    case 'set-mode': {
      const v = collectForm(); v.mode = a.v;
      openSheet('form', { providerId: sheet.providerId, serviceId: sheet.serviceId, values: v });
      break;
    }
    case 'set-theme': state.settings.theme = a.v; save(state); applyTheme(); render(); break;
    case 'set-currency': state.settings.currency = a.v; save(state); render(); break;
    case 'toggle-setting': state.settings[a.key] = !state.settings[a.key]; save(state); render(); break;
    case 'test-service': await testService(a.id); break;
    case 'delete-service':
      openSheet('confirm', {
        title: 'Remover provedor', text: 'Remover este provedor e seu histórico local?',
        onConfirm: () => {
          state.services = state.services.filter(s => s.id !== a.id);
          nativeCall('stopProxy', { id: a.id }).catch(() => {});
          save(state); closeSheet(); render(); toast('Provedor removido.');
        }
      });
      break;
    case 'confirm-yes': { const fn = sheet?.onConfirm; closeSheet(); if (fn) fn(); break; }
    case 'toggle-proxy': await toggleProxy(a.id); break;
    case 'clear-proxy': await clearProxy(a.id); break;
    case 'goto-proxy': currentTab = 'proxy'; render(); break;
    case 'exit-amoled': await exitAmoled(true); break;
    case 'copy':
      try { await navigator.clipboard.writeText(a.text); toast('Copiado!', 'ok'); }
      catch { toast('Não foi possível copiar.', 'err'); }
      break;
    case 'export': exportData(); break;
    case 'import': importData(); break;
    case 'save-service': {
      const v = collectForm();
      const p = getProvider(sheet.providerId);
      const required = p.fields.filter(f => f.required).map(f => f.key);
      if (required.some(k => !v[k])) { openSheet('form', { ...sheet, values: v, missing: true }); break; }
      const existing = sheet.serviceId ? state.services.find(s => s.id === sheet.serviceId) : null;
      const svc = {
        ...(existing || {}), ...v,
        id: existing?.id || uid(),
        providerId: p.id,
        mode: v.mode || p.modes[0],
        name: v.name || p.name,
        label: v.label || v.name || p.name,
        snapshot: existing?.snapshot || null,
        proxyRunning: false
      };
      if (existing) Object.assign(existing, svc); else state.services.push(svc);
      save(state); closeSheet(); render(); toast('Provedor salvo. Carregando modelos...', 'ok');
      fetchModels(svc, false);
      break;
    }
    case 'open-models': openModels(a.id); break;
    case 'model-info': openSheet('modelInfo', { serviceId: a.id, modelId: a.model }); break;
    case 'reload-models-sheet': {
      const s = state.services.find(x => x.id === sheet?.serviceId);
      if (s) await testAllModels(s);
      break;
    }
    case 'fetch-rate': await fetchRate(true); break;
    case 'check-update': await checkUpdate(true); break;
    case 'update-info': if (state.updateInfo) openSheet('update'); break;
    case 'download-update': await downloadUpdate(); break;
    case 'open-release': window.open(state.updateInfo?.page || RELEASE_URL, '_blank'); break;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.setting) {
    state.settings[el.dataset.setting] = el.type === 'number' ? Number(el.value) : el.value;
    save(state); setupRefresh(); render();
  }
});

$('#btnRefresh').addEventListener('click', () => refreshAll());
$('#btnTheme').addEventListener('click', () => {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  save(state); applyTheme(); render();
});
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

/* --------------------------------- init ---------------------------------- */
applyTheme();
render();
setupRefresh();
// Cadastros antigos do OpenCode podem ter a lista vinda da rota errada:
// sempre recarrega do console para marcar os modelos Go como ativos.
state.services.filter(s => s.providerId === 'opencode' && s.apiKey).forEach(s => fetchModels(s, false));
if (state.settings.autoRate) fetchRate(false);
checkUpdate(false);
setInterval(tickAmoled, 2000);
setInterval(shiftAmoled, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && amoledOn) lockScreen(true);
});
if (hasNativeBridge()) {
  getStats();
  setInterval(() => {
    if (currentTab === 'proxy' || currentTab === 'dashboard' || currentTab === 'amoled') getStats();
  }, 4000);
  try {
    const b = window.Capacitor.Plugins.TokenBridge;
    if (b && b.addListener) b.addListener('proxyUsage', () => getStats());
  } catch { /* eventos opcionais */ }
}
