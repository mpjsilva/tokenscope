// Camada de rede: usa o plugin nativo (OkHttp via HttpURLConnection) quando no
// Android, para evitar CORS. No navegador, cai para fetch().

export function isNative() {
  try {
    const c = window.Capacitor;
    return !!(c && typeof c.getPlatform === 'function' && c.getPlatform() !== 'web');
  } catch { return false; }
}

const NATIVE_METHODS = [
  'request', 'startProxy', 'stopProxy', 'getStats', 'clearStats', 'getLocalIp',
  'keepAwake', 'setBrightness'
];

export function bridge() {
  try {
    const c = window.Capacitor;
    if (!c) return null;
    if (c.Plugins?.TokenBridge) return c.Plugins.TokenBridge;
    // O plugin é registrado apenas no lado nativo (MainActivity). O bridge
    // injetado expõe nativePromise, então criamos o proxy JS aqui mesmo.
    if (typeof c.nativePromise !== 'function') return null;
    const proxy = {};
    for (const method of NATIVE_METHODS) {
      proxy[method] = (args = {}) => c.nativePromise('TokenBridge', method, args);
    }
    proxy.addListener = (eventName, callback) =>
      c.nativeCallback('TokenBridge', 'addListener', { eventName }, callback);
    c.Plugins = c.Plugins || {};
    c.Plugins.TokenBridge = proxy;
    return proxy;
  } catch { return null; }
}

function short(s) { return String(s || '').slice(0, 200); }

export async function requestRaw({ url, method = 'GET', headers = {}, body = null, timeout = 25000 }) {
  const b = bridge();
  const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
  if (b && typeof b.request === 'function') {
    const r = await b.request({ url, method, headers, body: payload, timeout });
    return { status: Number(r.status) || 0, body: r.body || '' };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers, body: payload || undefined, signal: ctrl.signal });
    return { status: res.status, body: await res.text() };
  } finally { clearTimeout(timer); }
}

export async function requestJSON(opts) {
  const r = await requestRaw(opts);
  if (r.status >= 400) throw new Error(`HTTP ${r.status}: ${short(r.body)}`);
  try { return JSON.parse(r.body); } catch { return { raw: r.body }; }
}

export async function nativeCall(name, args = {}) {
  const b = bridge();
  if (!b || typeof b[name] !== 'function') {
    throw new Error('Esta função está disponível apenas no app Android.');
  }
  return b[name](args);
}

export function hasNativeBridge() { return !!bridge(); }
