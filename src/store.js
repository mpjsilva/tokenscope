const KEY = 'tokenscope.v1';

export function defaultState() {
  return {
    version: 1,
    services: [],
    history: [],
    settings: {
      theme: 'dark', refreshMinutes: 15, currency: 'BRL',
      usdBrl: 5.4, hideValues: false, estimateCost: true,
      autoRate: true, rateAt: null
    }
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const d = defaultState();
    const migrate = x => {
      const y = { ...x, providerId: x.providerId === 'opencode-go' ? 'opencode' : x.providerId };
      if (y.providerId === 'claude' && y.label === 'Claude (assinatura)') y.label = 'Claude';
      if (y.providerId === 'claude' && y.name === 'Claude (assinatura)') y.name = 'Claude';
      return y;
    };
    return {
      ...d, ...parsed,
      services: Array.isArray(parsed.services) ? parsed.services.map(migrate) : [],
      history: Array.isArray(parsed.history) ? parsed.history.map(migrate) : [],
      settings: { ...d.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return defaultState();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Falha ao salvar estado', e); }
}

export function uid() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function recordHistory(state, service, snap) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = state.history.find(h => h.date === today && h.serviceId === service.id);
  const row = {
    date: today, serviceId: service.id, providerId: service.providerId,
    input: snap.input || 0, output: snap.output || 0,
    total: snap.total, cost: snap.cost
  };
  if (existing) Object.assign(existing, row);
  else state.history.push(row);
  state.history = state.history.slice(-370);
}
