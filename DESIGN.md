---
name: TokenScope
description: Painel de uso e custo de IA com modo AMOLED e leitura de relance
colors:
  midnight-ink: "#0b0e17"
  deep-navy: "#111626"
  surface-card: "#141a2c"
  surface-raised: "#1a2138"
  hairline-navy: "#252e47"
  paper-text: "#eef1fa"
  quiet-text: "#8d97b5"
  faint-text: "#8490ad"
  amethyst-viva: "#8b5cf6"
  signal-cyan: "#22d3ee"
  signal-ok: "#34d399"
  signal-warn: "#fbbf24"
  signal-err: "#fb7185"
  day-paper: "#f3f5fb"
  day-card: "#ffffff"
  day-ink: "#141a2c"
  day-line: "#dfe4f0"
  day-muted: "#5d6783"
  amoled-black: "#000000"
  amoled-white: "#f2f2f2"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 500
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 750
    letterSpacing: "-0.3px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.09em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
rounded:
  xs: "3px"
  sm: "9px"
  md: "11px"
  brand: "12px"
  tile: "15px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "5px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.amethyst-viva}"
    textColor: "{colors.paper-text}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.paper-text}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  icon-button:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.quiet-text}"
    rounded: "{rounded.md}"
    size: "36px"
    height: "36px"
    width: "36px"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.quiet-text}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  text-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.paper-text}"
    rounded: "{rounded.md}"
    padding: "11px 12px"
  progress-bar:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
    height: "7px"
  nav-item:
    textColor: "{colors.faint-text}"
    padding: "5px 0"
---

# Design System: TokenScope

## Overview

**Creative North Star: "O Painel de Instrumentos"**

Esta é uma interface de medição, não de apresentação. O fundo é um navy profundo que funciona como vidro escuro de instrumento: ele não compete com os números, ele os sustenta. A hierarquia é construída por peso e tamanho — o valor de consumo aparece grande, tabular e com leitura imediata; rótulos são pequenos, maiúsculos e espaçados, como inscrições em um equipamento. Violeta e ciano não são decoração: são sinal de navegação ativa, de progresso e de estado.

O sistema tem três esquemas distintos, não um tema único. O escuro padrão é o painel de trabalho. O claro é uma variante real com superfícies claras e tinta escura — não um invert. O modo AMOLED é uma superfície autônoma de preto puro, sem gradiente, sem navegação e sem sombra, feita para ficar ligada: os números são mais finos, o deslocamento é lento e o brilho é controlado pelo plugin nativo. Essa terceira superfície é a assinatura mais reconhecível do produto e deve sobreviver a qualquer refatoração.

**Key Characteristics:**
- Painel escuro por camadas tonais, com numeradores tabulares em destaque.
- Dois acentos de sinal (violeta e ciano) usados com parcimônia.
- Três esquemas: escuro, claro e AMOLED de preto puro.
- Contêiner de 520px no celular, com navegação inferior fixa e insets de sistema respeitados.
- Componentes de ferramenta: pills, sheets, switches e barras de progresso — não uma vitrine de marketing.

> Nota de origem: o North Star, os adjetivos de voz e os nomes descritivos das cores foram **inferidos do CSS e do README** porque a rodada de perguntas qualitativas foi interrompida. Todos os valores, tamanhos e comportamentos abaixo são extraídos do código.

## Colors

Uma paleta de instrumento: fundos frios e neutros sustentam acentos saturados que só aparecem quando há algo a comunicar.

### Primary
- **Ametista Viva** (#8b5cf6): acento primário. Marca a navegação ativa, o botão principal, o foco de campos e o início das barras de progresso.

### Secondary
- **Ciano de Sinal** (#22d3ee): acento secundário. Distingue o valor de hoje no gráfico, o link de ação nos títulos de seção e o fim das barras de progresso — aquilo que é corrente, não acumulado.

### Neutral
- **Tinta Meia-Noite** (#0b0e17): fundo do painel escuro, também declarado como `theme-color`.
- **Navy Profundo** (#111626): superfície de nível intermediário; base translúcida da navegação inferior.
- **Superfície de Card** (#141a2c) e **Superfície Elevada** (#1a2138): os dois níveis tonais de cards, ilhas de métrica e campos.
- **Fileira Navy** (#252e47): borda de contorno; presente em praticamente todo componente.
- **Texto de Papel** (#eef1fa), **Texto Quieto** (#8d97b5) e **Texto Fraco** (#8490ad): três níveis de leitura para valor, rótulo e metadado.
- **Papel Diurno** (#f3f5fb), **Card Diurno** (#ffffff), **Tinta Diurna** (#141a2c), **Fileira Diurna** (#dfe4f0), **Quieto Diurno** (#5d6783): o esquema claro completo.
- **Preto AMOLED** (#000000) e **Branco AMOLED** (#f2f2f2): o terceiro esquema, restrito à tela sempre ligada.

### States
- **Verde de OK** (#34d399), **Âmbar de Atenção** (#fbbf24) e **Rosa de Erro** (#fb7185): semáforo de status em pills, gráficos e barras de limite.

### Named Rules
**The Signal-Only Accent Rule.** Violeta e ciano aparecem em estado, navegação ativa e progresso — nunca como fundo de texto corrido. Se um elemento não está comunicando algo, ele é neutro.

**The Three-Scheme Rule.** Escuro, claro e AMOLED são três esquemas com intenções diferentes. O modo AMOLED nunca herda gradiente, sombra ou bordas do painel normal.

## Typography

**Display Font:** stack do sistema (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, Arial, sans-serif)
**Body Font:** o mesmo stack do sistema
**Label/Mono Font:** `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace

**Character:** Uma pilha de sistema sem pretensão tipográfica — a personalidade vem do peso, do espaçamento e dos numeradores tabulares, não de uma família de assinatura. No modo AMOLED o peso cai e o tracking se abre, transformando a mesma interface em um display de instrumento.

### Hierarchy
- **Display** (800, 32px, line-height 1.1, tracking −1.2px): o valor total na abertura da visão geral.
- **Headline** (500, 25px): zona do relógio no modo AMOLED, com `tabular-nums`.
- **Title** (750, 17px, tracking −0.3px): nome da marca e títulos de sheet.
- **Body** (400, 15px, line-height 1.45): texto corrente e descrições.
- **Label** (700, 12px, tracking +0.09em, maiúsculas): títulos de seção e campos de formulário.
- **Mono** (12px): chaves e URLs copiáveis.

### Named Rules
**The Tabular Number Rule.** Todo número que muda em tempo real usa `font-variant-numeric: tabular-nums`. Sem isso, os valores vibram lateralmente a cada atualização e a leitura de relance se perde.

## Layout

O app é uma coluna de no máximo 520px centrada, com 12px laterais no conteúdo das views e padding inferior reservado para a navegação fixa (`84px + env(safe-area-inset-bottom)`). Cards usam 16px internos; o ritmo de gaps fica entre 8 e 12px. A navegação inferior tem cinco destinos e acompanha a mesma largura de 520px, com blur de fundo e borda superior. Sheets ocupam a largura da coluna, no máximo 90vh, e crescem a partir da borda inferior com alça de arrasto.

Os insets de sistema são tratados como parte do layout, não como detalhe: topo (`env(safe-area-inset-top)`), base (`env(safe-area-inset-bottom)`) e `viewport-fit=cover` no HTML. Há um único breakpoint em `min-width: 521px`, onde a coluna ganha `min-height: 100vh` e uma sombra externa ampla — fora do celular, o painel se comporta como um objeto sobre a mesa. O modo AMOLED rompe a coluna: ocupa a largura toda, sem sombra e sem navegação.

**Tradução nativa (confirmada como plataforma android):** ao levar estes valores para Compose/Android Views, mapear as cores para papéis Material 3 (primary, surface, on-surface, outline, error), usar `sp` em vez de `px` fixo e manter alvos de toque de 48dp com 8dp de separação — os botões de ícone de 36px do HTML são o limite inferior aceitável apenas dentro do WebView.

## Elevation & Depth

Híbrido, com precedência tonal: a profundidade vem primeiro dos níveis `--bg` → `--bg-2` → `--card` → `--card-2`, separados por bordas de 1px. Sombras são ambientais e discretas, não estruturais.

### Shadow Vocabulary
- **Sombra de card** (`0 10px 30px rgba(0,0,0,.28)`): altitude padrão dos cards no tema escuro.
- **Sombra diurna** (`0 8px 24px rgba(20,26,44,.08)`): versão clara, bem mais rasa.
- **Halo de desktop** (`0 0 60px rgba(0,0,0,.25)`): isola a coluna quando exibida acima de 521px.
- **Anel de foco** (`0 0 0 3px rgba(139,92,246,.14)`): confirmação de foco em campos.

### Named Rules
**The Tonal-First Rule.** Se uma superfície precisa parecer mais alta, mude o nível tonal antes de aumentar a sombra. No modo AMOLED não há sombra alguma — apenas divisórias de 1px.

## Shapes

Cantos arredondados, mas não uniformes: 999px para pills e barras, 24px para sheets (apenas os cantos superiores), 18px para cards, 15px para tiles de template, 12px para a marca e logos de serviço, 11px para botões e campos, 9px para tags e botões pequenos, 3px para micro-ícones. Toda superfície é cercada por 1px de `--line`. A marca é um quadrado arredondado com gradiente violeta→índigo→ciano; os logos dos provedores são quadrados arredondados de 40px com a imagem oficial dentro.

## Components

### Buttons
- **Shape:** 11px de raio, com transição de 0.15s.
- **Primary:** preenchimento em gradiente de 135° de Ametista Viva para índigo, sem borda, texto branco, padding 10px 14px.
- **Hover / Focus:** borda muda para violeta; o botão principal não muda de cor no hover, apenas os secundários.
- **Secondary / Ghost / Danger:** fundo de superfície elevada, transparente ou texto rosa respectivamente, todos com a mesma geometria.

### Chips / Pills
- **Style:** fundo de superfície elevada, borda de 1px, raio total, 11px de altura de texto e padding 5px 10px.
- **State:** um ponto de 6px à esquerda comunica OK, atenção ou erro; a cor do ponto é o único indicador de estado.

### Cards / Containers
- **Corner Style:** 18px, borda de 1px, 16px internos.
- **Background:** nível `--card`, com o card de destaque ("hero") recebendo gradiente violeta/ciano e borda violeta.
- **Shadow Strategy:** sombra de card; veja Elevation & Depth.
- **Internal Padding:** 16px; métricas internas usam 11–12px.

### Inputs / Fields
- **Style:** fundo `--card`, borda `--line`, raio 11px, padding 11px 12px, fonte herdada.
- **Focus:** borda violeta e anel de 3px em rgba(139,92,246,.14).
- **Hint:** texto auxiliar de 11px em tom fraco abaixo do campo.

### Navigation
- **Style:** barra inferior fixa com 5 destinos, fundo translúcido de `--bg-2` com blur de 18px e borda superior.
- **State:** inativo em `--muted-2`, ativo em Ciano de Sinal; ícone de 20px sobre rótulo de 11px.
- **Mobile treatment:** sempre presente no celular; oculta no modo AMOLED.

### Signature: AMOLED Screen
Tela preta pura, relógio de 52px com peso 200 e tracking −3px, pares de métricas com valores de 25px e barras de 2px. Divisórias de 1px em cinzas muito escuros (`#1a1a1a`, `#121212`). O conteúdo desloca-se 0.9s a cada minuto para reduzir burn-in. Não há marca, navegação, gradiente nem sombra — apenas leitura.

## Do's and Don'ts

### Do:
- **Do** preservar `viewport-fit=cover` e todos os `env(safe-area-inset-*)`; o app roda dentro de um WebView Android com recorte e barra de navegação do sistema.
- **Do** manter `tabular-nums` em relógio, totais e percentuais.
- **Do** manter os três esquemas — escuro, claro e AMOLED — como implementações independentes.
- **Do** usar os logos oficiais em `src/icons/` e o ícone de marca gerado a partir de `novo-icone.jpeg`.
- **Do** limitar a coluna a 520px e a navegação a cinco destinos.

### Don't:
- **Don't** usar preto puro fora do modo AMOLED; o painel padrão é `#0b0e17`.
- **Don't** colocar violeta ou ciano como fundo de parágrafo — acento é sinal, não papel de parede.
- **Don't** portar controles iOS (bottom-only navigation copiada do iPhone, switches de Cupertino, diálogos de iOS) para este app Android; a barra inferior aqui é a convenção Material para 5 destinos, mas o gerenciamento de Back do sistema é obrigatório.
- **Don't** remover o deslocamento anti-burn-in do modo AMOLED nem introduzir sombras nele.
- **Don't** substituir os logos dos provedores por marcações genéricas ou inventar valores de custo que a API não fornece.
