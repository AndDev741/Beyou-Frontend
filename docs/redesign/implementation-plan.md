# Redesign Beyou — plano de implementação

Plano de execução do redesign visual aprovado. O desenho de referência é o mockup
(`beyou-redesign-mockup.html`, artifact publicado); o card de acompanhamento é
["Pensar em uma logo melhor e atualizar app background e web favicon"](https://app.notion.com/p/3962c12010f08010b806fa2ad2532ba4).

Este documento é a especificação para quem implementa. Cada PR abaixo é fechado em si:
descreve o objetivo, os arquivos, as guardas que não podem quebrar e como verificar.

---

## Decisões assumidas

Três decisões estavam em aberto. O plano assume as respostas abaixo; onde a resposta
muda o trabalho, está anotado no PR correspondente.

| Decisão | Assumido | Se mudar |
|---|---|---|
| Modelo de temas | Os 9 temas viram 2 bases (claro/escuro) + packs de acento | Só o PR 1.2 muda de forma |
| Sequência mobile | Pareado por domínio: web e mobile da mesma página em sequência | Reordena a Fase 6, nada mais |
| Superfícies sem mockup | Tudo fechado no mockup (v1.19: cobertura 100%) | — |

Pendências de desenho: **todas resolvidas no mockup v1.19 (2026-08-02)** — snapshot e
item picker (6.2), cartões dos 3 widgets com spec de cores de gráfico (6.1), estados de
carregamento (3.2), auth do Expo + sheet do assistente (4.4/6.8), "Abrir no app" nos cards
de reset/verify. Nenhum PR está bloqueado por desenho.

---

## Dependências de dados

O desenho está fechado, mas quatro detalhes dele mostram informação que a API não devolve
hoje. Nenhum bloqueia o redesign: são adições de backend que podem vir depois, desde que o
componente seja escrito para degradar sem o dado (esconder o elemento, não quebrar).

| O que o mockup mostra | Onde | Estado hoje | Saída |
|---|---|---|---|
| Barras da semana em Melhor área e Pior área | PR 6.1 | Não existe XP por categoria por dia. O widget atual só mostra ícone, nome, nível e barra de XP — não tem gráfico nenhum | Endpoint de série semanal por categoria, ou entregar o cartão sem as barras na v1 |
| "melhor: 9" (recorde de constância do hábito) | PR 6.3, hábito estendido | `HabitResponseDTO` devolve só `constance`. `maxConstance` existe, mas é do **usuário**, não do hábito | Campo novo no DTO do hábito |
| "Check-ins 32 desde 12 jun" | PR 6.3, hábito estendido | Nem o total nem a data do primeiro check-in existem no DTO | Dois campos novos no DTO do hábito |
| Heatmap de 16 semanas | PR 5.3 | Não existe histórico diário de conclusão exposto | Endpoint de histórico (já estava fora do caminho crítico) |

O que **existe** e pode ser usado à vontade: `maxConstance` do usuário (backend
`UserResponseDTO` e `RefreshUserDTO` → frontend `UserType` e `perfilSlice`), então o
"melhor: 21" do widget de Constância e do perfil está coberto. E o XP decaído do check
atrasado que o modo snapshot mostra é real: a estratégia de decaimento de XP existe e é
configurável em Configuração.

---

## Guardas — valem para todo PR

1. **Rótulos de navegação não mudam.** A suíte e2e usa 68 seletores por texto/role
   contra 2 por testId. `Routines`, `Habits`, `Config`, `Categories`, `Next`,
   `Continue`, `Skip`, `Get Started` e os headings de página têm que sobreviver.
   Se um texto precisar mudar, adicione `data-testid` **antes** e atualize a spec
   no mesmo PR.
2. **Âncoras do tutorial migram junto.** `data-tutorial-id` (`dashboard-shortcuts`,
   `shortcut-*`, `dashboard-routine-today`, `dashboard-profile`, `habits-grid`,
   `categories-grid`, `routine-*`, `agent-fab`, `feedback-fab`) precisa continuar
   montando em algum elemento visível. Quebrou o âncora, quebrou `tutorial.spec.ts`.
3. **Nada de hex hardcoded.** Hoje são 24 ocorrências na web (8 no `themes.css`) e 23
   no mobile. Esse número não sobe. Cor vem de token.
4. **Nada de `dark:` do Tailwind.** Nada no app adiciona a classe `.dark` — as 14
   ocorrências atuais são código morto e o PR 1.4 as remove. Tema é resolvido por CSS
   var em runtime pelo `ThemeProvider`, não por variante de classe.
5. **Texto em `en` e `pt`.** Chaves novas entram nos dois arquivos
   (`packages/i18n/src/{en,pt}/translation.json`). `translationKeys.test.ts` cobre a paridade.
6. **`prefers-reduced-motion` respeitado** em qualquer animação nova.
7. **Verificação mínima por PR:** `npm run test` na raiz (turbo roda web + mobile) e
   `npm run typecheck`. PRs das fases 4 e 6 rodam também a suíte e2e contra a stack e2e.

---

## Fase 1 — Fundação

### PR 1.1 — Camada de tokens

**Objetivo:** o app inteiro passa a usar a paleta nova sem que nenhum componente seja tocado.

O modelo atual tem 8 tokens; o novo tem 13, e a semântica muda (hoje `secondary` é a cor do
texto e não existe `surface` nem `border`). A ponte é manter os 8 nomes antigos como
**aliases** dos novos. Como um componente sozinho não sabe se `bg-background` era cartão ou
página, o alias escolhe o caso dominante:

| Token antigo | Vira | Porquê |
|---|---|---|
| `background` | `--surface` | 110 dos 136 usos são cartão, input ou modal |
| `secondary` | `--text` | é a cor de texto principal hoje |
| `description` | `--text-2` | |
| `placeholder` | `--text-3` | |
| `icon` | `--text-2` | |
| `primary` | `--accent` | |
| `success` | `--success` | |
| `error` | `--danger` | |

O fundo de página (`--bg`) passa a ser aplicado explicitamente no `body`
(`apps/web/src/index.css`) e no wrapper do `App.tsx`, que hoje usam `bg-background` — são os
26 usos em `pages/` que precisam de revisão manual neste PR.

**Arquivos:**
- `packages/theme/src/theme.ts` — interface `Theme` com os 13 campos novos; os 8 antigos
  permanecem no tipo, marcados como `@deprecated`, para os 219 usos de `theme.*` em JS.
- `packages/theme/src/listOfThemes.ts` — as duas bases (`beYou`, `beYouDark`) ganham os
  campos novos; os outros 7 temas recebem valores derivados provisórios (o modelo definitivo
  é o PR 1.2).
- `apps/web/src/context/ThemeContext.tsx` — o bloco de `root.style.setProperty` passa a
  emitir os 13 tokens **e** os 8 aliases.
- `apps/web/src/themes.css` — mesmas variáveis no `:root` (fallback antes do JS rodar).
- `apps/mobile/src/theme/ThemeProvider.tsx` — `themeToVars` emite os 13 + aliases.
- `apps/web/tailwind.config.js` e `apps/mobile/tailwind.config.js` — cores novas, escala de
  raio (`frame: 24px`, `card: 16px`, `control: 10px`) e os nomes antigos mantidos.
- `apps/web/src/components/widgets/utils/chartColors.ts` — passa a ler os tokens novos.
  Canvas não resolve CSS var: o widget continua lendo cor concreta do objeto `theme`.
- `apps/web/src/components/habits/utils/useColors.tsx` — os 4 hex saem.

**Definition of done:** o diff não toca nenhum arquivo em `components/` além dos dois
consumidores de cor citados. Se tocou, o alias está errado. Screenshot do dashboard e de
Hábitos nos dois temas, web e Expo, anexado ao PR.

### PR 1.2 — Bases + packs de acento

**Objetivo:** trocar os 9 temas por 2 bases + packs, sem deixar usuário órfão.

`themeInUse` é uma string persistida no backend (`UserType`, `perfilSlice`). Todo modo antigo
precisa de destino:

| Modo salvo | Vira |
|---|---|
| beYou | base clara + pack Beyou |
| beYouDark | base escura + pack Beyou |
| Sunset | base clara + pack Pôr do sol |
| Amethyst | base clara + pack Ametista |
| Midnight, Polar | base escura + pack Beyou |
| Cyberpunk | base escura + pack Cyber |
| Mocha | base clara + pack Pôr do sol |
| Late Latte | base escura + pack Pôr do sol (é um tema ESCURO: bg #2c1e1e) |
| desconhecido | base pela preferência do SO + pack Beyou |

**Arquivos:** `packages/theme/src/listOfThemes.ts` (bases + `accentPacks`),
`apps/web/src/services/user/hydratePerfil.ts` (fallback ao ler o perfil),
`apps/web/src/components/configuration/ThemeSelector.tsx`,
`apps/web/src/components/authentication/ThemeSelectorInline.tsx`,
`apps/mobile/src/ui/ThemeSelector.tsx`, `apps/mobile/src/theme/ThemeSync.tsx`,
nomes dos temas em `packages/i18n`.

**Guarda:** `ThemeContext.test.tsx` cobre a precedência conta → localStorage → SO. Os quatro
casos continuam passando, mais um caso novo: modo desconhecido cai no fallback.

**Se a decisão mudar** (manter os 9 temas): este PR vira "expressar os 9 temas nos 13 tokens"
e o mapa de migração some.

### PR 1.3 — Tipografia Geist

**Objetivo:** Geist na interface, Geist Mono em número, XP e horário.

Hoje a web carrega Inter pelo CDN do Google (`apps/web/index.html`) e usa
`fontFamily.mainFont` via a classe `font-mainFont` no `App.tsx`.

**Arquivos:**
- `apps/web/public/fonts/` — woff2 self-hosted (evita a dependência de terceiro e o FOUT do CDN).
- `apps/web/index.html` — sai o `<link>` do Google, entra `<link rel="preload">` do peso crítico.
- `apps/web/src/index.css` — `@font-face` com `font-display: swap`.
- `apps/web/tailwind.config.js` — `sans: Geist`, `mono: Geist Mono`; `mainFont` vira alias
  de `sans` para não quebrar o `App.tsx` de imediato.
- `apps/mobile/` — fontes em `assets/fonts/`, `useFonts` no `app/_layout.tsx` com gate de
  splash até carregar, `fontFamily` no `tailwind.config.js`.

**Guarda:** número tabular. Onde houver XP, nível, contagem ou horário, a classe é `font-mono`.

### PR 1.4 — Superfícies no lugar de bordas

**Objetivo:** matar a borda azul, que é o traço mais datado do visual atual.

São 204 ocorrências de `border-primary` na web e 134 no mobile. A maioria é divisa neutra e
vira `border-border`; ficam em acento apenas os estados de seleção (opção ativa, chip marcado,
input em foco). O PR também normaliza o raio para a escala de uma família por camada
(cartão 16, controle 10, frame 24, pill full) — hoje convivem `rounded-md`, `lg`, `xl`, `2xl`
e `[20px]` sem critério — e remove as 14 variantes `dark:` mortas.

**Guarda:** é um sweep grande mas mecânico. Revise o diff procurando os casos em que a borda
azul era intencional; eles são poucos e o mockup mostra quais.

---

## Fase 2 — Marca (paralela à Fase 1)

### PR 2.1 — Marca na web

Símbolo: anel a 83% com abertura no nordeste e o check apontando para a abertura. A variante
de 16px tem traço mais grosso (`r=23`, `stroke-width=11`) porque o traço de 8 some nesse tamanho.

`apps/web/public/favicon.svg`, `apps/web/index.html` (`theme-color`),
`apps/web/src/components/authentication/logo.tsx`,
`apps/web/src/components/authentication/MobileBrand.tsx`. Wordmark unificado em minúsculo:
"beyou" — hoje o app alterna entre "Be you" e "Beyou", inclusive nas traduções.

### PR 2.2 — Marca no Expo

`apps/mobile/src/ui/Logo.tsx`, `apps/mobile/src/ui/MobileBrand.tsx`,
`apps/mobile/assets/{icon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png`,
e o `backgroundColor` do adaptive icon no `app.json` (hoje `#0082E1`).

**Atenção:** o ícone do Android é adaptativo — a marca precisa caber na área segura (66% do
canvas), senão o launcher corta o anel.

---

## Fase 3 — Componentes

O mockup tem uma seção de inventário; ela é o contrato. Um componente por peça, e a mesma
peça em todo lugar.

### PR 3.1 — Primitivos web

- **Ring** — um componente só para o logo, o check-in, o anel de nível e o progresso do dia
  (`size`, `progress`, `state`, `showCheck`). Se divergirem, a assinatura da marca quebra.
  Absorve o `progressRing.tsx` atual.
- **Chip** — variantes `flame`, `xp`, `time`, `cat`, `ok`, mais tamanho `sm`. `time` e `xp` em mono.
- **Card / Surface** — o fim do `bg-background + border-primary` copiado.
- **IconTile** (o tile do ícone do hábito) e **IconButton** (as ações discretas de editar e excluir).
- **Button** — refatorar os 4 modos do mockup (primary, tonal, ghost, danger) com estados
  desenhados, e matar as larguras fixas `w-[250px]` / `w-[120px]`. São 42 importadores: o
  componente mantém a API atual (`text`, `size`, `mode`) e ganha os modos novos, para o sweep
  ser incremental.
- **Skeleton** — decisão de loading do mockup (atom "Carregamento"): o skeleton espelha o
  cartão que substitui, shimmer 1.6s desligado sob `prefers-reduced-motion`; spinner central
  **apenas** no gate de autenticação do boot.

### PR 3.2 — Compostos web

**PageHeader**, **Toolbar** (busca + ordenar + filtrar, hoje refeita em cada listagem),
**SegmentedControl** (importância, dificuldade, experiência, modo), **Stepper** (progresso de
meta), **StatTile**, **XpBar** + **LevelChip**, **OptionCard**, **GhostAdd**.
`Modal` e `EmptyState` já existem e só se alinham ao sistema — o `Modal` já tem foco, Escape e
`aria-labelledby`, não regrida isso.

Estados de carregamento: resolvido — usar o primitivo `Skeleton` do PR 3.1 nas cinco páginas
web com gate de loading (e no mobile, no 3.3).

### PR 3.3 — Espelho no mobile

Mesmas peças em React Native (`apps/mobile/src/ui/`). Não dá para compartilhar componente entre
DOM e RN; o que é compartilhado é o token. Mantenha nome e props iguais aos da web para o
próximo desenvolvedor não ter que aprender dois vocabulários.

---

## Fase 4 — Shell e navegação

### PR 4.1 — Sidebar web

Sidebar colapsável na ordem confirmada: Hoje, Categorias, Hábitos, Tarefas, Rotinas, Metas;
no rodapé, **Feedback** (decisão v1.16: item próprio, acima de Configuração) e Configuração,
junto do usuário. Substitui a barra azul (`components/header.tsx`) e a coluna de atalhos
(`components/dashboard/shortcuts.tsx`).

O item de menu substitui o `FeedbackLauncher` flutuante — a bolha de feedback morre neste PR
(só o balão do assistente continua flutuando). O âncora `feedback-fab` do tutorial migra do
launcher para o item da sidebar.

**Colisão de rótulo prevista:** o mockup escreve "Configuração" por extenso e o e2e seleciona
"Config" por texto — aplicar o procedimento da guarda nº 1 (testId antes + spec no mesmo PR).

**Doze arquivos renderizam `<Header>` hoje** — 7 páginas do app, 4 de autenticação e o admin.
As páginas do app param de renderizar header próprio: o shell passa a ser montado uma vez, no
`ProtectedRoute.tsx`, que já monta `BottomNav`, `AgentWidget` e `FeedbackLauncher`. As páginas
de autenticação mantêm o header próprio delas.

**Guarda crítica:** `data-tutorial-id="dashboard-shortcuts"` e os seis `shortcut-*` vivem hoje
no `shortcuts.tsx`. Eles precisam montar na sidebar nova, ou o tutorial e o `tutorial.spec.ts`
quebram. Rode `tutorial.spec.ts` neste PR.

### PR 4.2 — Bottom nav da web responsiva

De 6 itens para 5, com o Assistente no centro e uma sheet "Mais" para Tarefas, Metas,
Categorias, Perfil, Configuração e **Feedback** (6 tiles, v1.16). `components/dashboard/BottomNav.tsx`.
`getByRole("link", { name: ... })` precisa continuar achando os itens que saíram da barra —
eles passam a viver na sheet, então a spec pode precisar de um passo a mais para abri-la.

### PR 4.3 — Bottom nav do Expo

Mesma mudança em `apps/mobile/src/ui/dashboard/BottomNav.tsx` e `app/(app)/_layout.tsx`.

### PR 4.4 — Painel do assistente

O balão flutuante vira painel lateral de altura cheia na web e sheet quase de tela cheia no
mobile. Cabeçalho com o assunto da conversa em mono, histórico, nova conversa, expandir e
fechar. Ferramentas executadas viram chips discretos; entidades criadas ou alteradas viram
cartões com ícone e link "ver".

**Requisito de produto, não negociável:** o balão existe em toda página autenticada, web e
mobile, e é o único ponto de acesso ao agente. Não existe página nem aba de navegação para ele.

A sheet do mobile está desenhada no mockup (v1.19): 86% da tela, aberta pelo botão central.

---

## Fase 5 — Momentos de jogo

### PR 5.1 (web) e 5.2 (mobile)

`XpFloat` (chip flutua 1.2s e some), `CelebrationOverlay` (level-up e marcos de constância em
7, 14, 21, 30, 60, 90 e 100), `RoutineCompleteSummary` (itens, XP do dia, streak) e os quatro
estados do anel de check-in: a fazer, hover, feito, pulado.

**Observação da revisão:** o contraste do estado "pulado" foi corrigido no mockup v1.19
(borda `text-3`, ícone `text-2`); implemente com esses tokens e verifique nos dois temas.

Check-in de snapshot (dia passado) **não** dispara celebração — o `useUiRefresh` já recebe
`skipCelebrations`. Não regrida isso.

### PR 5.3 — Heatmap de constância

Feature nova, precisa de endpoint de histórico de check-ins (ver "Dependências de dados").
Fora do caminho crítico: só entre depois de alinhar com o backend.

---

## Fase 6 — Páginas

Uma PR por domínio, web e mobile em sequência para a decisão de design não esfriar entre as
duas plataformas.

| PR | Página | Observação |
|---|---|---|
| 6.1 | Dashboard / Hoje | Widgets completos no mockup, com spec de cores de gráfico para o chartColors.ts. **As barras da semana em Melhor/Pior área dependem de dado que não existe** — ver "Dependências de dados" |
| 6.2 | Rotinas | Modo snapshot e TaskAndHabitSelector desenhados (v1.19) |
| 6.3 | Hábitos | Biblioteca separada do formulário; descrição fica no cartão. **O hábito estendido pede melhor constância e total de check-ins, que o `HabitResponseDTO` não devolve** |
| 6.4 | Tarefas | Esqueleto de Hábitos sem XP nem streak |
| 6.5 | Metas | Stepper no cartão; "Concluir" só com o alvo batido; o editor não tem campo de progresso atual |
| 6.6 | Categorias | |
| 6.7 | Configuração | Seções agrupadas; a lista de widgets vira a ordenação por arraste |
| 6.8 | Autenticação | Login, criar conta, esqueci, redefinir, verificar; phone Expo desenhado; "Abrir no app" em reset/verify |
| 6.9 | Feedback e admin | Admin é rota `ROLE_ADMIN`; teste com conta de admin de verdade |
| 6.10 | Onboarding e tutorial | Reskin, sem redesenho estrutural — são 7,4 mil linhas testadas de ponta a ponta |

Cada PR de página: remove o que restou de token antigo naquele escopo, troca os cartões
ad-hoc pelos componentes da Fase 3, e roda a spec e2e do domínio.

---

## Fase 7 — Limpeza

- Remover os 8 aliases de token; a partir daqui só existem os 13.
- Apagar `components/header.tsx` e `components/dashboard/shortcuts.tsx`.
- Remover `mainFont` do Tailwind e a classe do `App.tsx`.
- Atualizar `CLAUDE.md`: a seção de design system fala em 9 temas e em
  "nunca hardcode `#0082E1`, use `var(--primary)`" — as duas frases envelhecem neste redesign.

---

## Ordem e dependências

```
1.1 tokens ─┬─ 1.2 packs ──┐
            ├─ 1.3 Geist ──┤
            └─ 1.4 bordas ─┴─→ 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 4.4 → 5.x → 6.x → 7
2.1 / 2.2 marca ─ paralelas, sem dependência
```

A Fase 1 é o único gargalo real: nada da 3 em diante faz sentido antes dos tokens existirem.
2.1 e 2.2 podem sair a qualquer momento.
