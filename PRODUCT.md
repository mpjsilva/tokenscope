# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Equipe interna — uso restrito ao grupo de trabalho. **Confirmado pelo usuário na entrevista de setup.**

## Product Purpose

Monitorar, em um só lugar, o uso de tokens, os limites e o custo estimado dos serviços de IA usados pela equipe. O sucesso é saber quanto foi consumido e quanto custou sem precisar consultar cada provedor separadamente. **Extraído de `README.md`; o escopo de uso interno foi confirmado pelo usuário.**

## Operating Context

Uso no celular, com uma tela AMOLED sempre ligada que desloca o conteúdo para reduzir burn-in, e um proxy local no dispositivo para contagem de tokens em tempo real. Chaves, histórico e configurações ficam apenas no dispositivo (`localStorage` no WebView). **Extraído de `README.md`.**

## Capabilities and Constraints

- Coleta por APIs de uso (OpenCode Go, OpenRouter, OpenAI, DeepSeek) e por proxy local (Anthropic, Claude, Groq, Together, Gemini e OpenAI-compatible customizado). **Fonte: `README.md`.**
- Claude.ai (assinatura) não expõe API pública de uso para API key no celular; o limite da assinatura é visto na extensão de navegador. **Fonte: `README.md`.**
- OpenAI, Anthropic e Groq bloqueiam chamadas diretas do navegador por CORS; no APK isso é resolvido pelo plugin nativo `native/TokenBridgePlugin.java`. **Fonte: `README.md`.**
- Build debug assinado com a chave padrão do Android; reinstalar sobre o mesmo pacote (`com.tokenscope.app`) preserva chaves, histórico e ajustes. **Fonte: `README.md`.**
- Custos são estimativas com cotação configurável; a Admin API da OpenAI não devolve custo por requisição. **Fonte: `README.md`.**
- Decisão Confirmada pelo usuário: a identidade visual será documentada primeiro **apenas para o TokenScope**; os demais programas da pasta herdam depois, quando virarem projetos ativos.

## Brand Commitments

- Nome **TokenScope** e assinatura verbal "Uso de IA sob controle" em `index.html`. **Fonte: código existente.**
- Ícone de marca: `novo-icone.jpeg` (1024×1024), com fundo preto removido em `src/icons/tokenscope-brand.png` (arte completa), `src/icons/tokenscope-mark.png` (marca circular) e launcher/adaptive icons em `native/launcher/`. **Fonte: `README.md`.**
- Logos oficiais dos provedores em `src/icons/` devem ser preservados como ativos factuais; o ícone da OpenAI aparece com cores invertidas e o da DeepSeek com fundo branco para não misturar roxo sobre roxo. **Fonte: `README.md`.**

## Evidence on Hand

- `README.md` — descrição, serviços cobertos, fluxo de uso, privacidade e limitações.
- `index.html`, `src/styles.css`, `src/app.js`, `src/{store,providers,net,usage}.js` — implementação web existente e sistema visual encarnado.
- `native/TokenBridgePlugin.java` — ponte Android (HTTP sem CORS, proxy local, keep-awake/brilho AMOLED).
- `src/icons/` e `native/launcher/` — identidade gráfica e logos dos provedores.
- `TokenScope-debug.apk` — build distribuível.
- **Ausência a não fabricar:** não há depoimentos, clientes, números de adoção ou estudos de caso documentados.

## Product Principles

1. Consumo e custo precisam ser legíveis de relance, sem exigir ida a cada provedor.
2. Dados sensíveis e chaves permanecem no dispositivo.
3. O app precisa funcionar bem no celular, inclusive como tela sempre ligada.

<!-- Inferido (não dito explicitamente pelo usuário): os itens acima foram derivados de README.md e do comportamento implementado. A entrevista confirmou somente usuário, plataforma e escopo do projeto. -->
