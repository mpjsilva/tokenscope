# TokenScope

App Android (Capacitor) para monitorar **uso de tokens, limites e custo estimado** de vários serviços de IA em um só lugar.

- APK pronto: `TokenScope-debug.apk` (instale direto no celular; é um build debug, assinado com a chave padrão do Android).
- Código-fonte web: `index.html`, `src/`.
- Plugin Android nativo: `native/TokenBridgePlugin.java` (HTTP sem CORS + proxy local + keep-awake/brilho do modo AMOLED).
- Logos oficiais dos provedores em `src/icons/` (favicons 128×128 salvos localmente).
- v1.9 / versionCode 10: mesmo pacote (`com.tokenscope.app`) e mesma chave debug — instalar por cima **preserva chaves, histórico e ajustes**.
- Modelos gratuitos ganham a tag **Grátis** na lista e o campo "Gratuito" na ficha do modelo (critério: preço de entrada e saída zero na API, ou "free" no id/nome).
- Atualização automática: o app consulta a API de releases do GitHub (`mpjsilva/tokenscope`), mostra um aviso quando há versão nova e baixa/instala o APK da release pelo botão **Baixar e instalar** (plugin nativo + FileProvider). `RELEASE_URL` é a página da última release.
- Dashboard focado em limites e custo: sem contador de tokens e sem gráfico de barras verticais.
- Terminologia: "provedor" no lugar de "serviço" na interface; botão dos cards agora é **Atualizar**.
- Card do OpenCode: três barras horizontais de limite (Janela 5h, Semanal e Mensal) com percentual e reset de cada uma.
- Toque em um modelo na lista para ver detalhes: custo de entrada/saída por 1M, fornecedor, se é open source, família, contexto e descrição.
- No modo AMOLED, a saída se dá pela dock inferior (mesma identidade das outras telas, adaptada ao preto); os textos de rodapé foram removidos.
- OpenCode: os modelos ativos vêm do grupo `opencode-go` do console (assinatura Go/Go Plus/Go Teams), sem chamada de chat — evita falsos "indisponíveis" por saldo ou regra de acesso.
- Ícone da marca (`novo-icone.jpeg`) com fundo preto removido: `src/icons/tokenscope-brand.png` (arte completa), `tokenscope-mark.png` (marca circular) e launcher/adaptive icon em `native/launcher/`.

## Serviços incluídos

| Serviço | Coleta | Como funciona |
|---|---|---|
| **OpenCode** (Go / Go Plus / Go Teams) | API de uso | Tenta `/inference/go/v1/usage` e `/zen/go/v1/usage` — rolling/weekly/monthly da assinatura da chave |
| **OpenRouter** | API de uso | `/api/v1/usage` + `/key` (tokens por modelo, custo e limite) |
| **OpenAI** | API de uso | Admin API `/organization/usage/completions` (precisa chave admin) |
| **DeepSeek** | API + proxy | `/user/balance` (saldo USD) e contagem exata via proxy |
| **Anthropic, Claude, Groq, Together, Gemini** | Proxy local | Conta `usage.prompt_tokens` / `completion_tokens` de cada resposta |
| **OpenAI-compatible customizado** | API e/ou proxy | Você informa base URL, chave e, se quiser, endpoint de uso próprio. Ícone do OpenAI com cores invertidas |

Ao salvar um serviço, o app consulta automaticamente `{baseUrl}/models` (ou a rota oficial do OpenCode). **Toque no card** para abrir a lista: ela aparece em blocos conforme você rola (começo → meio → **Fim da lista**), com busca. O botão **Atualizar** testa todos os modelos em background (3 em paralelo) e reordena a lista com os operacionais primeiro; cada modelo mostra uma bolinha verde (OK), amarela (testando) ou vermelha (indisponível). O DeepSeek usa fundo branco no ícone para não misturar roxo sobre roxo.

Em **Ajustes**, o campo USD → BRL pode buscar a cotação do dia na API livre `open.er-api.com` (manualmente ou automaticamente ao abrir).

## Instalar e usar

1. Copie `TokenScope-debug.apk` para o celular e instale (habilite "Fontes desconhecidas").
2. Abra o app → **Serviços** → **Adicionar serviço** → escolha o provedor.
3. Cole a API key. Use chaves **restritas** (ex.: `Usage: Read`) e com expiração.
4. Toque em **Testar** ou no botão ⟳ para atualizar.
5. **Visão geral** mostra tokens de hoje, custo estimado, gráfico de 7 dias, limites e progresso, com o logo real de cada serviço.
6. Aba **AMOLED**: tela preta com relógio, tokens/custo e limites atualizados em tempo real. Mantém a tela ligada, reduz o brilho e desloca o conteúdo a cada minuto para reduzir burn-in. Toque em **Sair** para voltar ao normal.

### Modo Proxy (contagem em tempo real)

1. Adicione um serviço, escolha o modo **Proxy local** e configure a base URL (ex.: `https://api.groq.com/openai/v1`).
2. Va em **Proxy** → **Iniciar**. O app escuta em `http://127.0.0.1:<porta>`.
3. No seu cliente de IA, troque a base URL por esse endereço e mantenha a chave original.
4. O app repassa `/chat/completions` para o provedor e registra tokens de entrada/saída e número de chamadas.
5. Use o IP local do celular (mostrado pelo plugin) se o cliente estiver em outro dispositivo da mesma Wi-Fi.

> O proxy depende do app aberto/em primeiro plano. Para uso contínuo em segundo plano, seria necessário um foreground service com notificação.

## Privacidade

Chaves, histórico e configurações ficam **apenas no dispositivo** (`localStorage` no WebView). Nada é enviado a terceiros além das chamadas diretas às APIs dos provedores. Para máquinas compartilhadas, prefira chaves com permissão mínima e prazo curto.

## Limitações conhecidas

- Claude.ai (assinatura) não tem API pública de uso para API key no celular: use a extensão de navegador para os limites da assinatura e o proxy para chamadas da API Anthropic.
- OpenAI, Anthropic e Groq não permitem chamadas diretas do navegador por CORS — no APK isso é resolvido pelo plugin nativo.
- Custos são estimativas (cotação configurável em Ajustes); Admin API da OpenAI não retorna custo por requisição.
- Build debug: para publicar na Play Store, gere um keystore e configure `signingConfigs` no `android/app/build.gradle`.

## Recompilar o APK

O build foi feito no **macaco** (192.168.1.254). O script `build-apk.sh` sincroniza `src/`, `index.html` e o plugin nativo, e traz o APK de volta:

```bash
./build-apk.sh
```

Ambiente usado no macaco:
- Node 24 (via nvm), Capacitor CLI 8.6.2
- JDK 21 em `~/tools/jdk21` (o Java 25 do sistema é incompatível com Gradle 8.14; Java 17 é velho para o Capacitor 8)
- Android SDK em `~/android-sdk` com plataforma/build-tools 36

Projeto remoto: `/home/jamerson/tokenscope`.
