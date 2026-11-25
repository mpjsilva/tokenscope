// Catálogo de serviços suportados. Cada modelo sabe como coletar uso (API) e/ou
// pode ser monitorado pelo proxy local OpenAI-compatible.

const KEY = (o = {}) => ({ key: 'apiKey', label: 'API key', type: 'password', required: true, ...o });
const BASE = (def, o = {}) => ({ key: 'baseUrl', label: 'Base URL', type: 'text', default: def, ...o });
const NUM = (key, label, def, hint) => ({ key, label, type: 'number', default: def, hint });

export const PROVIDERS = [
  {
    id: 'opencode', name: 'OpenCode', initials: 'OC', color: '#8b5cf6',
    category: 'Assinatura · Go / Go Plus / Go Teams', modes: ['api'],
    desc: 'Medidores de qualquer assinatura OpenCode (5h, semanal e mensal).',
    hint: 'A chave oc_sk_ é resolvida para a assinatura do workspace: Go, Go Plus ou Go Teams. Use permissão Usage: Read.',
    keyUrl: 'https://opencode.ai/console', keyHint: 'oc_sk_...',
    usageUrls: ['https://opencode.ai/inference/go/v1/usage', 'https://opencode.ai/zen/go/v1/usage'],
    modelsUrl: 'https://opencode.ai/console/api/v1/models',
    chatUrl: 'https://opencode.ai/inference/openai/v1/chat/completions',
    fields: [KEY({ placeholder: 'oc_sk_...' }), NUM('limitTokens', 'Limite de tokens (opcional)', '', 'Se informado, estima tokens a partir do percentual usado.')]
  },
  {
    id: 'openrouter', name: 'OpenRouter', initials: 'OR', color: '#2dd4bf',
    category: 'Agregador · OpenAI-compatible', modes: ['api', 'proxy'],
    desc: 'Histórico diário de tokens por modelo e limite da chave.',
    hint: 'A chave começa com sk-or-.... A API de uso é pública para a própria chave.',
    keyUrl: 'https://openrouter.ai/keys', keyHint: 'sk-or-...',
    fields: [KEY({ placeholder: 'sk-or-...' }), BASE('https://openrouter.ai/api/v1')]
  },
  {
    id: 'openai', name: 'OpenAI', initials: 'OA', color: '#34d399',
    category: 'API direta', modes: ['api', 'proxy'],
    desc: 'Uso organizacional com chave de administrador (Admin API).',
    hint: 'Requer chave de administrador (sk-admin-... ou projeto com escopo de admin).',
    keyUrl: 'https://platform.openai.com/api-keys', keyHint: 'sk-admin-...',
    fields: [KEY({ placeholder: 'sk-admin-...' }), BASE('https://api.openai.com/v1')]
  },
  {
    id: 'anthropic', name: 'Anthropic', initials: 'AN', color: '#f59e0b',
    category: 'API direta · OpenAI-compatible', modes: ['proxy'],
    desc: 'Claude via API key. Sem endpoint público de uso histórico: use o proxy.',
    hint: 'O proxy conta tokens lendo o campo usage das respostas.',
    keyUrl: 'https://console.anthropic.com/settings/keys', keyHint: 'sk-ant-...',
    fields: [KEY({ placeholder: 'sk-ant-...' }), BASE('https://api.anthropic.com/v1')]
  },
  {
    id: 'claude', name: 'Claude', initials: 'CL', color: '#e879f9',
    category: 'Assinatura', modes: ['proxy'],
    desc: 'claude.ai não expõe uso por API key no celular. Monitore via proxy apenas para chamadas da API.',
    hint: 'Para ver os limites da assinatura, use a extensão Claude Usage no navegador.',
    keyUrl: '', keyHint: 'sk-ant-...',
    fields: [BASE('https://api.anthropic.com/v1')]
  },
  {
    id: 'groq', name: 'Groq', initials: 'GQ', color: '#f97316',
    category: 'Inferência rápida · OpenAI-compatible', modes: ['proxy'],
    desc: 'Sem endpoint de uso por chave: o proxy registra cada chamada.',
    hint: 'Base URL padrão OpenAI-compatible já preenchida.',
    keyUrl: 'https://console.groq.com/keys', keyHint: 'gsk_...',
    fields: [KEY({ placeholder: 'gsk_...' }), BASE('https://api.groq.com/openai/v1')]
  },
  {
    id: 'together', name: 'Together AI', initials: 'TA', color: '#60a5fa',
    category: 'Inferência · OpenAI-compatible', modes: ['proxy'],
    desc: 'Monitoramento por proxy: tokens input/output de cada requisição.',
    keyUrl: 'https://api.together.ai/settings/api-keys', keyHint: '...',
    fields: [KEY({ placeholder: '...' }), BASE('https://api.together.xyz/v1')]
  },
  {
    id: 'deepseek', name: 'DeepSeek', initials: 'DS', color: '#818cf8', logoBg: '#ffffff',
    category: 'API direta · OpenAI-compatible', modes: ['api', 'proxy'],
    desc: 'Saldo em USD via API + contagem de tokens pelo proxy.',
    hint: 'A API pública de saldo não informa tokens; informe o crédito inicial para estimar.',
    keyUrl: 'https://platform.deepseek.com/api_keys', keyHint: 'sk-...',
    fields: [KEY({ placeholder: 'sk-...' }), BASE('https://api.deepseek.com'), NUM('initialCredits', 'Crédito inicial (USD, opcional)', '', 'Usado para estimar tokens consumidos a partir do saldo.')]
  },
  {
    id: 'gemini', name: 'Google Gemini', initials: 'GE', color: '#4285f4',
    category: 'OpenAI-compatible', modes: ['proxy'],
    desc: 'Endpoint OpenAI-compatible do Gemini monitorado pelo proxy.',
    hint: 'Use a base URL OpenAI-compatible do Gemini, não a API nativa.',
    keyUrl: 'https://aistudio.google.com/app/apikey', keyHint: 'AIza...',
    fields: [KEY({ placeholder: 'AIza...' }), BASE('https://generativelanguage.googleapis.com/v1beta/openai')]
  },
  {
    id: 'custom', name: 'OpenAI-compatible', initials: '+', color: '#94a3b8',
    category: 'Personalizado', modes: ['api', 'proxy'],
    desc: 'Qualquer serviço com API no formato OpenAI (base URL + chave).',
    hint: 'Informe a base URL terminando em /v1. O campo de endpoint de uso é opcional.',
    keyUrl: '', keyHint: '',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Meu provedor' },
      BASE('https://api.exemplo.com/v1', { required: true }),
      KEY({ placeholder: 'sk-...', required: false }),
      { key: 'usageUrl', label: 'Endpoint de uso (opcional)', type: 'text', placeholder: 'https://api.exemplo.com/v1/usage' },
      NUM('limitTokens', 'Limite de tokens (opcional)', '', 'Para calcular percentual da barra.')
    ]
  }
];

// Logos oficiais (favicons 128x128 dos sites dos provedores), servidos localmente.
const ICON_FILES = {
  'opencode': 'opencode.png',
  'openrouter': 'openrouter.png',
  'openai': 'openai.png',
  'anthropic': 'anthropic.png',
  'claude': 'claude.png',
  'groq': 'groq.png',
  'together': 'together.png',
  'deepseek': 'deepseek.png',
  'gemini': 'gemini.png',
  'custom': 'openai-compatible.png'
};
// Endpoint usado para testar se um modelo está operacional (1 token).
const CHAT_URLS = {
  'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
  'openai': 'https://api.openai.com/v1/chat/completions',
  'anthropic': 'https://api.anthropic.com/v1/chat/completions',
  'claude': 'https://api.anthropic.com/v1/chat/completions',
  'deepseek': 'https://api.deepseek.com/chat/completions',
  'groq': 'https://api.groq.com/openai/v1/chat/completions',
  'together': 'https://api.together.xyz/v1/chat/completions',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
};
for (const p of PROVIDERS) {
  p.icon = ICON_FILES[p.id] ? `src/icons/${ICON_FILES[p.id]}` : null;
  if (!p.chatUrl && CHAT_URLS[p.id]) p.chatUrl = CHAT_URLS[p.id];
}

export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id) || PROVIDERS[PROVIDERS.length - 1];
}

export const MODE_LABELS = { api: 'API de uso', proxy: 'Proxy local' };
