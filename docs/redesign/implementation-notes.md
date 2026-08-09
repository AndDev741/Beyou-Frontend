# Redesign — notas de implementação para revisão

Registro do que foi feito fora do previsto, do que ficou pendente e das dúvidas
que precisam de decisão. Complemento do
[plano](implementation-plan.md); a ordem segue as fases do plano.

---

## Achados que valem revisão antes do merge

### 1. Bug pré-existente: variantes de opacidade não geravam CSS

Cor declarada no Tailwind como `var(--x)` faz o **Tailwind v3 descartar o
modificador de barra**. `bg-primary/10`, `border-primary/20` e companhia nunca
emitiram regra nenhuma — o elemento ficava sem fundo e sem borda, silenciosamente.
Isso já era assim antes do redesign, em dezenas de lugares.

Corrigido emitindo cada token também em canais crus (`--accent-rgb: 29 107 243`)
e declarando as cores como `rgb(var(--accent-rgb) / <alpha-value>)`. O hex
continua sendo emitido para o CSS puro e para o objeto de tema do React Native.

**A conferir:** o mesmo vale para o NativeWind no mobile. Lá as cores continuam
como `var(--x)` puro, então `bg-accent/10` no app nativo provavelmente também não
funciona. Não mexi porque o NativeWind resolve variáveis por conta própria e a
troca precisa de teste em device.

### 1b. Texto branco fixo sobre o acento

No tema escuro o acento é claro (`#5C9DFF`), então todo `text-white` sobre ele
ficava ilegível. Eram 20 ocorrências na web e seis constantes
`ON_PRIMARY = '#FFFFFF'` no mobile; todas passaram a usar `on-accent`, que é o
par correto por tema.

**Atenção no mobile:** `style={{ color: 'var(--x)' }}` NÃO funciona no React
Native — só o `className` passa pelo NativeWind. A escala de
importância/dificuldade, que era hex cru num style inline, virou classe
(`bg-accent`, `bg-flame`, …) por causa disso.

### 2. `userInterfaceStyle` do Expo estava fixo em `light`

Com isso `useColorScheme()` responderia claro para sempre e o modo "sistema"
nunca escureceria no app nativo. Passou para `automatic` no `app.json`.

### 3. Dependências de dados continuam de pé

Nada mudou desde a auditoria: as barras semanais de Melhor/Pior área, o recorde
de constância por hábito, o total de check-ins e o heatmap seguem sem dado na
API. Os componentes que os exibiriam foram escritos para **degradar sem o dado**
(escondem o elemento), não para inventar número.

Duas decisões concretas nos widgets, ambas comentadas no código:

- **Faixa de constância** (widget Constância): sem histórico diário, a faixa de
  28 dias destaca apenas a sequência ATUAL — que é dado real — e deixa o resto
  neutro, com legenda dizendo isso. Quadrado apagado não significa "falhei",
  significa "não sabemos"; a legenda existe para ninguém ler errado.
- **Melhor/Pior área**: entram sem as barras da semana do mockup. Mostram
  ícone, nome, nível e a barra de XP do nível, que é o que a API devolve.

---

## Decisões tomadas durante a implementação

| Decisão | Por quê |
|---|---|
| `background` (alias antigo) aponta para `--surface` | 110 dos 136 usos eram cartão/input/modal; o fundo de página virou `bg-bg` explícito no body, no wrapper do App e nas páginas |
| Preferência de tema é uma string `"<modo>:<pack>"` | O backend guarda `themeInUse` como texto livre; assim modo e acento viajam juntos sem migração de schema |
| Modo desconhecido cai em `system:beyou` | Nenhuma conta pode ficar sem tema quando um modo antigo deixa de existir |
| Sweep de borda por heurística de linha | Linha com ternário = estado de seleção (fica no acento); linha sem = divisa neutra (vira `border-border`). Depois passei manualmente nos cartões e inputs que tinham ternário na mesma linha |
| Rótulo da sidebar recolhida vai para `sr-only` | O e2e acha os links pelo nome acessível; some do DOM e a suíte quebra |
| Cada peso do Geist é uma família própria no mobile | O RN não sintetiza peso a partir de um arquivo só |

---

## Pendências

### Não implementado nesta rodada

- **Heatmap de constância** (PR 5.3 do plano): depende de endpoint de histórico.
- **Telas estendidas** (hábito, tarefa e meta abertos em detalhe, com stat
  tiles e heatmap) não existem: o cartão expande no lugar, como antes.
- **App Expo**: recebeu tokens, tipografia, marca, primitivos e a shell nova
  (barra de 5 alvos, sheet do assistente), mas as TELAS em si (hábitos,
  tarefas, metas, categorias, rotinas, configuração) ainda têm o layout
  antigo. A revisão página a página desta rodada cobriu só a web.
- **Onboarding e tutorial**: herdaram tokens e componentes, mas o reskin
  desenhado (scrim + anel do acento no spotlight, wizard com Ring de seleção)
  não foi feito.
- **Admin de feedback**: só tokens; os StatTiles e o split lista/detalhe do
  mockup não entraram.
- **Modo snapshot da página Rotinas e o seletor de hábito/tarefa**: herdaram
  tokens, mas a faixa de contexto, o estado vazio próprio e o modal de busca
  com seleção múltipla desenhados na v1.19 não foram implementados.

### Dívida deixada de propósito

- Os **aliases dos 8 tokens antigos continuam emitidos**. A fase de limpeza
  (PR 7.1 do plano) ainda não rodou; enquanto isso, código novo pode usar sem
  perceber um nome antigo.
- `apps/web/src/components/ActionButton.tsx` referencia cores que não existem no
  tema (`primary-foreground`, `destructive`, `accent-foreground`) — é um resto de
  shadcn com um único importador. Não mexi: merece decidir se some.
- O cache do Vite (`apps/web/node_modules/.vite`) tem arquivos de root de alguma
  execução em container, e o dev server não sobe por isso. Validei tudo por
  `npm run build` + servidor estático. Precisa de um `sudo rm -rf` fora daqui.

---

### O que o e2e precisa adaptar (repo Beyou-e2e-tests, fora deste PR)

O formulário de criação saiu de junto dos cartões e virou modal nas quatro
listagens. Isso muda o caminho, não os nomes:

1. `HabitFormPage.expectCreateFormVisible()` depois de `habits.goto()` falha —
   o formulário só existe depois de abrir o modal. Basta clicar antes:
   `authedPage.getByTestId("create-habit").click()`. Título, campos, rádios e o
   botão de submit continuam com os mesmos nomes.
2. `submitCreate()` agora fecha o modal ao salvar (antes deixava o formulário
   vazio na tela).
3. `HabitsPage.cardOf()` já estava quebrado antes desta rodada: procura
   `ancestor::div[contains(@class,'border-primary')]` e o cartão novo usa
   `border-border`. Sugestão: `ancestor::div[contains(@class,'rounded-card')][1]`.
4. `profile-persistence.spec.ts`: "Sunset" agora resolve para `#E45A0B` (ver
   acima).
5. `tutorial.spec.ts` passa sem mudança — os âncoras migraram para os botões de
   criar e os passos seguem válidos.

### Dúvidas que quero revisadas

1. **O painel de marca do login no tema escuro** usa `bg-accent`, que no escuro
   é o azul claro — vira uma área muito luminosa ao lado de um cartão escuro. O
   contraste do texto está correto (`on-accent` é o navy), mas talvez o desenho
   peça um acento profundo nesse painel específico. Precisa de olho de designer.
2. **Sweep de borda por heurística.** A regra "linha com ternário = seleção"
   acertou na maioria, e eu revisei cartões e inputs à mão, mas vale passar o
   olho em telas menos óbvias (agendar rotina, seletor de ícones, wizard de IA).
3. **O radar do Equilíbrio saiu do chart.js para SVG.** Ganhou tema e pack de
   acento de graça (canvas não resolve CSS var) e tirou uma dependência do
   caminho do dashboard, mas perdeu o tooltip nativo da biblioteca. Se o
   tooltip fizer falta, é reimplementável em cima do SVG.
4. **`CategoryForm` ficou com `<select>` na experiência** enquanto o formulário
   de hábito virou segmented. Trocar é mudança de lógica (o select devolve
   string, o segmented devolve número), então parei — é um follow-up de uma
   linha se quiser igualar.
5. **Geometria do botão central da barra no Android.** O disco é posicionado
   absoluto e sobra 14px para fora do pai; comportamento de toque fora do pai
   no Android merece um teste em device.

## Revisão visual logada (2026-08-03)

Com credencial válida contra a stack de dev, revisei as páginas renderizadas.
Achados corrigidos na mesma passada:

- **"+1490 XP ganhos hoje"** no widget Hoje: ele lia `perfil.xp`, que é o
  acumulado de vida. Agora soma os checks de hoje da rotina.
- **Chips de dias do cartão de rotina não acendiam**: o backend grava
  `"Monday"` e a comparação era com `"MONDAY"`.
- **Cabeçalho de Rotinas** eram três blocos soltos e o seletor mostrava os
  últimos cinco dias corridos; virou um cartão só com a semana de segunda a
  domingo.
- **Perfil na Configuração** com rótulo de 18px e o `alt` da foto vazando do
  círculo ("erfil" na tela).
- **Mobile de Rotinas**: semana quebrava em duas linhas e as ações espremiam o
  nome da rotina.

Lembrete que custou tempo: neste projeto `sm` é **350px**, não 640 — o corte
útil para telefone é `md` (712px).

## Passada de telefone em Rotinas (2026-08-03)

- **Contagem de dias é medida, não fixa.** O seletor lê a largura da linha e
  mostra de 3 a 7 caixas conforme o aparelho (5 em 360px, 6 em 390px, 7 a
  partir de ~430px). Com isso caiu o `overflow-x-auto` — era ele que recortava
  o popover do calendário.
- **"Mais datas" virou coluna** (ícone sobre o rótulo) para ocupar a largura de
  uma caixa em vez de uma pílula larga.
- **Botão de criar colapsa para um disco com "+"** abaixo de `md`. O rótulo
  continua no DOM em `sr-only`, então o nome acessível segue "Criar rotina" —
  é por ele que o e2e acha o botão.
- **Cartão de rotina no telefone**: nome, cadência, chips de dias e uma barra
  só. Duas barras iguais empilhadas não diziam qual importava agora; a que
  aparece é a do dia quando a rotina roda nele, e a de nível quando não roda.
  As ações só aparecem ao abrir pelo título.
- **Interior expandido saiu do visual antigo**: usava checkbox nativo,
  preenchimento verde e a classe `bg-ligthGray/40` (token que não existe mais).
  Agora usa o mesmo anel de check da rotina do dia.

## Formulário de rotina e balão do assistente (2026-08-03)

- **O balão do assistente comia o fim da página no desktop.** O espaçador do
  `ProtectedRoute` era `h-20 lg:hidden` — existia só para a barra inferior do
  mobile. No desktop o balão é `fixed bottom-6` e caía sobre o último cartão;
  com uma rotina expandida, sobre a borda inferior e a última linha. Virou
  `h-20 lg:h-24`.
- **Criar/editar rotina** ganhou o desenho do mockup (Tipo · Nome · Seções ·
  rodapé). A bifurcação de duas ilustrações foi removida: pedia uma escolha
  entre "diária" e um formato que não existe. O tipo agora é campo, com "em
  lista" desabilitado e visível.
- **`SectionsEditor`** passou a ser o dono da lista de seções; criar e editar
  mantinham a mesma árvore de drag-and-drop copiada.
- **Seletor de ícone (`iconsBoxSmall`)** tinha largura fixa (45vw / 160px /
  12rem) e um campo de busca de 90px que cortava o placeholder. Agora acompanha
  a largura do formulário. Usado também nos modais de criação rápida de hábito
  e tarefa.
- **Agendar** virou a fileira de sete quadrados do mockup, com os atalhos
  (Seg–Sex, fim de semana, toda semana) em pílula e o conflito de dia resolvido
  numa faixa com "Liberar dia" em vez de tooltip no hover.
- **Não implementado do mockup:** o link "Prefere datas específicas?". O modelo
  de agenda é só dia-da-semana (`schedule.days`); datas avulsas exigem backend.
  Entra na lista de dependências de dados.
- **`addRoutineButton.tsx` ficou órfão** (nenhum importador) desde que criar
  virou modal, e ainda carrega o âncora `routine-add-button`. Não apaguei
  porque está fora do que foi pedido; candidato à fase de limpeza.

## Seletor de hábito/tarefa (2026-08-04)

Substituiu as duas fileiras de scroll horizontal e os dois campos de horário
que vinham ANTES da escolha do item. O novo seletor tem busca, alternância
Hábitos/Tarefas, seleção múltipla com o anel, estado "já na seção" e contagem
no botão.

- **Horários sugeridos em sequência** (`suggestSlots`, exportada e coberta por
  teste): retomam do fim do último item da seção e dividem o restante da janela
  entre os itens escolhidos; sem hora de término na seção, 15 minutos por item.
  A sugestão nunca cai fora da seção, então `getItemTimeErrorKeys` passa por
  construção — antes o usuário digitava dois horários e descobria o erro depois.
- **Não implementado do mockup:** a criação rápida "pede só nome e ícone". Hoje
  `habitCreateSchema` exige importância, dificuldade, ícone **e ao menos uma
  categoria** — e categoria não tem padrão razoável para escolher no lugar do
  usuário. Reduzir o formulário exige decidir o que a conta ganha por omissão
  (produto), então os modais de criação rápida seguem completos.
- `HabitOrTaskGroup.tsx` era o cartão da fileira antiga e foi removido junto.

**Nota de ambiente:** o container do dev server (`beyou-dev-env-frontend-1`)
serviu por um tempo um bundle antigo de `packages/i18n` — as chaves novas
apareciam cruas na tela mesmo já presentes no arquivo dentro do container. Um
`docker restart` do serviço resolveu; vale lembrar disso antes de caçar um bug
de i18n que não existe.

## Ajustes finos (2026-08-04)

- **Scrollbar fantasma.** Toda página autenticada media `min-h-screen` e a
  shell acrescentava o espaçador de 80/96px — o documento ficava sempre
  `100vh + espaçador`, e até uma página vazia rolava. As páginas sob a shell
  passaram a medir `calc(100vh - espaçador)`; login, boot e erro continuam
  `min-h-screen` porque não têm shell.
- **Chevron de expandir no mobile.** O cartão de rotina e o cabeçalho de seção
  do formulário escondem as ações até abrir, mas nada indicava que expandiam.
  Entrou o chevron ao lado do nome (só abaixo de `md`, gira 180° aberto). O
  cartão de snapshot já tinha o dele.

## Seções recolhíveis do dashboard + menu (2026-08-04)

- **"Hoje" vira "Dashboard"** na sidebar e na barra inferior. Chave nova
  (`NavDashboard`): o "Today" antigo continua sendo usado nos chips de dia, no
  widget Hoje e nos títulos do tutorial — mexer nele quebraria o e2e.
- **Seções da rotina do dia recolhíveis** por chevron, com o estado salvo no
  localStorage por dia (`beyou-routine-collapsed` → `{ data: [ids] }`). A
  seção recolhida mostra ícone, nome, horário e o chip de XP do dia — o
  usuário que completou a seção economiza o espaço dela. Amanhã abre de novo.
  Coberto por 3 testes (recolher persiste, começa recolhida, é por dia).

## Categorias (2026-08-04)

- **Ações no topo do cartão.** Editar e excluir saíram do rodapé (só aparecia
  expandido, separado por `border-t`) e foram para o cabeçalho, à esquerda do
  chevron: `md:opacity-0` com revelação em `group-hover`/`group-focus-within`
  no desktop e sempre visíveis no telefone. Verificado com hover real: 0 → 1 e
  de volta a 0 ao sair.
- **"Usando em" acima da barra de nível.** O rodapé com borda que fazia o
  conteúdo expandido terminar cortado saiu; o cartão expandido termina na
  própria barra de XP.
- **Expansão isolada.** A grade esticava os cartões vizinhos à altura do
  expandido (`items-stretch` padrão), então a fileira inteira "crescia junto"
  com um clique. `items-start` na grade: só o cartão clicado muda (medido:
  165 → 261px no aberto, vizinho estável em 165px).

## Metas (2026-08-04)

- **Formulário no desenho do mockup** (criar e editar): Nome, Descrição,
  Motivação, Ícone, Alvo + Unidade (com a legenda de que o progresso nasce em
  0 e sobe pelo stepper), Período (início/término lado a lado), Prazo em
  segmentado e Categorias, rodapé Cancelar/Salvar meta. "Progresso atual" e
  "status" saíram do formulário: em edição preservam o valor real, em criação
  nascem zerados. O modal passou de `max-w-4xl` para `max-w-xl` e ganhou
  título próprio (antes o título morava dentro do form).
- **Botão Deletar**: já estava ligado ao DeleteModal no código — verificado ao
  vivo de ponta a ponta (criar meta descartável → Deletar → confirmar → some
  da grade). Quem via o botão morto estava num bundle antigo do dev container,
  mesmo sintoma das chaves de i18n cruas.
- **`t` de módulo vs hook**: `goals.tsx` usava `import { t } from "i18next"`,
  que funciona no app mas devolve `undefined` nos testes unitários (o i18n só
  é inicializado no boot do app). Passou para `useTranslation()` — idêntico no
  app e testável. Vale conferir outras páginas com o mesmo padrão.

## Categorias — cartão compacto e formulário (2026-08-04)

- **Cartão no desenho do mockup**: ícone, nome, ações no topo (hover no
  desktop, sempre no telefone), descrição e barra de XP com LV. O mockup não
  tem expansão nem "usando em", então a expansão adicionada na rodada
  anterior saiu — o cartão era 165–261px e virou 152px fixo.
- **Formulário**: Nome, Descrição, Ícone (o mesmo seletor compacto) e, só na
  criação, Experiência em segmentado com a legenda "ajusta a curva de XP da
  categoria". Edição não mostra experiência — `editCategory` não aceita o
  campo. Modal em `max-w-xl` com título próprio.
- O `onCreated` do `CategoryForm` continua vivo para a criação rápida do
  seletor de categorias (ChooseCategories), que também usa o formulário.

## Modal de deleção novo + chevron da categoria (2026-08-04)

- **DeleteModal no desenho do mockup** (compartilhado pelos quatro domínios):
  pergunta como título à esquerda, item entre aspas no corpo ("X" e tudo o que
  está ligado a ele serão removidos) e ações à direita — Cancelar (ghost)
  antes de Excluir (destrutivo). O corpo genérico substitui o nome sublinhado
  que existia; não inventamos contagens (o mockup citava "32 check-ins", dado
  que a API não devolve por domínio).
- **Chevron da categoria de volta**: o cartão compacto ganhou o chevron sempre
  visível; aberto, revela o "usando em" (hábitos/tarefas/metas em chips) ou a
  dica de adicionar a categoria em algum lugar. Fechado, segue o cartão do
  mockup.

## Hábitos, tarefas e o seletor de categorias (2026-08-04)

- **Formulários de hábito e tarefa no desenho do mockup**, mesmo esqueleto das
  outras bibliotecas: campo por campo em coluna, importância/dificuldade em
  segmentado (1..4, valores que o backend valida), experiência segmentada só
  na criação, ícone pelo seletor compacto e o rodapé Cancelar/Salvar hábito
  (ou tarefa). A tarefa ganhou o switch de "única conclusão" com legenda.
  Modais em `max-w-xl`.
- **Seletor de categorias virou a catrow do mockup**: chips de ícone + nome
  (selecionado = acento suave) e o "Nova categoria" como chip tracejado na
  própria fileira — antes era um título com botão de adicionar acima, o que
  duplicava o rótulo "Categorias" no formulário de meta.
- **e2e precisa acompanhar** (repo separado): o submit dos formulários de
  hábito e tarefa passou de "Create"/"Edit" para "Salvar hábito"/"Salvar
  tarefa"; os rádios de importância/dificuldade/experiência continuam com os
  mesmos nomes (o segmentado usa role=radio); a categoria agora é um
  `role=checkbox` com o nome da categoria.

## Ações no topo e expansão isolada (2026-08-04)

Mesmo tratamento de Categorias aplicado a hábito, tarefa e cartão de rotina:

- **Editar/excluir no topo**, à esquerda do chevron, revelados no hover
  (`md:group-hover`) e sempre visíveis no telefone. No cartão de rotina o
  Agendar continua sempre à vista — é a ação principal.
- **Tarefa perdeu o chevron.** Importância e dificuldade já apareciam no cartão
  fechado; expandir só revelava as ações, que agora moram no topo. Sem conteúdo
  escondido, o controle não tinha função.
- **`items-start` nas grades** de hábitos, tarefas e metas. Sem isso a fileira
  estica os cartões à altura do expandido e parece que a linha inteira abriu
  junto — mesmo bug que Categorias tinha. Medido em Hábitos: expandido 197 →
  457px, vizinhos parados em 197.
- Rotinas já era lista de coluna única, então lá não havia o que corrigir na
  expansão; só o hover das ações entrou.

## Exclusão de rotina e o "+" no telefone (2026-08-04)

- **Rotina passou a usar o DeleteModal compartilhado.** Era a única entidade
  com confirmação inline (uma faixa "Confirmar exclusão? Sim / Não" dentro do
  cabeçalho do cartão, que empurrava as outras ações). O modal ganhou o modo
  `routine`; como não existe slice de edição por id para limpar nesse caso, o
  switch não faz nada e a lista se atualiza por `enterRoutines`.
- **Criar vira só o "+" no telefone nas cinco listagens.** Só Rotinas tinha o
  `collapseLabel`; Hábitos, Tarefas, Categorias e Metas mostravam o botão
  inteiro e comiam a largura do cabeçalho. Medido: 40×40px em 390px e 142px
  com rótulo em 1440px. O submit do Feedback ficou como estava — é botão de
  formulário, não o criar da listagem.

## Cartão de meta (2026-08-04)

- **Anel de porcentagem removido** do canto superior direito: a barra do
  stepper já mostra o mesmo progresso, e o anel ocupava justamente o canto das
  ações. Lá entraram editar/excluir (hover no desktop, sempre no telefone) e o
  chevron.
- **Fechado**: ícone, nome, descrição, categoria, stepper e rodapé com prazo +
  data-limite. **Aberto**: motivação, status e o período completo.
- **"Concluir" só com o alvo batido** — e nesse momento o `+` sai de cena, já
  que o que resta a fazer é concluir (é ele que paga o XP). Alvo 0 nunca conta
  como batido.
- **Meta concluída** troca o stepper por **Desfazer** e mostra data + XP ganho
  (`Undo`/`Desfazer`, `+N XP earned`/`ganhos`).
- Testes: os dois de divisão por zero passaram a olhar o contador do stepper
  (o anel não existe mais) e entraram três novos — Concluir só no alvo,
  Desfazer na concluída e a expansão revelando a motivação.

## Página de Configuração (2026-08-06)

- **Cartões sem ladrilho de ícone e sem descrição** — o mockup tem só o título.
  Quatro ícones de acento competindo entre si empurravam o conteúdo para baixo.
- **Grid do desenho**: perfil + preferências à esquerda, aparência + widgets à
  direita. Antes a direita só tinha os widgets. No telefone empilha em coluna.
- **Perfil**: foto e "Trocar foto" numa linha no topo, campos em largura
  inteira, "Salvar perfil" à direita. A foto ocupava 30% da largura e espremia
  os inputs.
- **Sem cartão dentro de cartão**: os blocos de preferências perderam a
  superfície própria e a tipografia caiu para a gramática de rótulo (havia
  títulos de 18–20px dentro de um cartão cujo título tem 15px).
- **Idioma** virou o segmentado do sistema (eram dois quadrados EN/PT de 24px);
  os "Salvar" de cada bloco viraram tonais à direita.
- **Zona de soltar dos widgets** ficou discreta: fundo rebaixado e tracejado
  fino no lugar da moldura de 2px sobre superfície.

### Segunda passada na Configuração (2026-08-06)

- **Widgets viraram lista compacta** (alça, posição, ícone, nome, ×) com chips
  "+ nome" para os disponíveis. Antes eram duas zonas tracejadas com os
  widgets renderizados de verdade: impossível ordenar no telefone e sem
  mostrar a ordem. Cada mudança grava sozinha (`editUser({ widgetsId })`).
- **Seção Conta com Logout** — o botão vivia no `header.tsx`, apagado quando a
  sidebar nasceu; **desde então não havia como sair da conta pela interface**.
  Purga o redux-persist antes do redirect.
- **Caixas dobráveis no telefone**: cada seção abre ao toque (perfil já vem
  aberto); no desktop as duas colunas seguem abertas.
- **Ordem do mockup**: perfil, widgets e conta à esquerda; aparência e
  preferências à direita.
- **Salvar só no perfil**: constância e configurações de rotina passaram a
  gravar no clique, como tema e idioma já faziam. Os testes do botão de salvar
  do RoutineSettings viraram testes de gravação automática.

### Menu do telefone na Configuração (2026-08-07)

- As caixas viraram o menu do mockup: ladrilho de acento com ícone, nome e o
  chevron para o lado. O perfil mostra avatar, nome e "nível N · xp/next XP"
  em vez da palavra "Perfil".
- **Ordem por breakpoint sem duplicar markup**: as colunas usam
  `display: contents` abaixo de `lg`, então as seções viram filhas diretas do
  flex e a ordem do telefone (perfil, aparência, preferências, widgets, sair)
  sai de classes `order-*`. No desktop as colunas voltam a ser colunas.
- **Conta virou a linha vermelha de "Sair"**, sem o e-mail — ele já está no
  formulário de perfil.

## Página de Feedback (2026-08-07)

- **Assunto virou segmentado de três** (ícone só na opção escolhida). Em
  pílulas soltas as três opções pareciam filtros acumuláveis, quando são
  exclusivas.
- **Imagens ganharam zona de soltar**; os anexos viraram chips com o nome do
  arquivo. A grade de miniaturas de 96px empurrava o enviar para fora da tela
  no telefone com dois ou três prints.
- **Formulário dentro de um cartão**, rótulos na gramática do sistema e rodapé
  de uma linha: "prefere e-mail?" à esquerda, enviar à direita (no telefone o
  enviar ocupa a largura e o e-mail desce).
- A intro longa virou o **subtítulo do cabeçalho**.
- Testes ajustados: a intro agora é o subtítulo, o input de imagens é achado
  pelo `aria-label` e os anexos são chips, não `img[alt]`.

## Painel do Assistente (2026-08-07)

- **Desktop: painel lateral de altura cheia** encostado à direita, no lugar do
  popover de 440px flutuando no canto. Expandido continua o overlay central
  com a coluna de histórico.
- **Telefone: sheet de 86%** ancorada embaixo, topo arredondado (medido 726 de
  844px), no lugar da tela cheia.
- **Cabeçalho separa identidade de contexto**: "Assistente IA" fixo e o assunto
  da conversa em mono embaixo. Antes o título era o nome do chat, que o agente
  renomeia sozinho.
- **Ferramentas viraram chips** discretos (mono, contorno leve) em vez de
  caixas com fundo de acento.
- **Sugestões acima do input**, numa linha rolável, sempre que há conversa —
  antes só existiam no estado vazio.
- **Ajustes na sequência**: painel de 420 → 520px, sheet de 86% → 92%, e o
  **modo tela cheia foi removido** junto da coluna de histórico que só existia
  nele (o histórico continua no botão do cabeçalho). As sugestões voltaram a
  quebrar linha, limitadas a duas — em linha rolável a terceira ficava cortada
  na borda do painel.
- **Não implementado do mockup:** os cartões de entidade criada com link "ver".
  `agentSegment` só carrega `tool`, `error` e `domains` — não vem id nem nome
  da entidade. Precisa de backend; entra na lista de dependências de dados.

## Console de feedback do admin (2026-08-07)

- **Contagens viraram StatTile**; filtros viraram dois selects compactos numa
  linha, com o rótulo dentro da opção "todos".
- **Lista e detalhe dividem a tela** (`lg:grid-cols-2`): abrir um item não
  empurra a lista para fora. No telefone o detalhe desce; no desktop ele fica
  `sticky` enquanto a lista rola.
- **Linha escaneável**: ícone por categoria, título em uma linha, autor e data
  em mono, status em pílula à direita. O e-mail saiu da lista — vive no
  detalhe, onde a resposta é escrita (o teste passou a olhar o nome).
- **Cores semânticas de status**: `FEEDBACK_STATUS_BADGE_CLASSES` ainda usava
  `text-primary` e `border-description`, aliases do modelo antigo.
- O contexto capturado virou linhas mono chave/valor, como no mockup.

## Vazios, notificações e celebração (2026-08-07)

### EmptyState

- O `emoji` virou `icon: ReactNode`: uma IconTile com o ícone da entidade
  (`Folder`, `Repeat`, `ListChecks`, `CalendarDays`, `Trophy`, `LayoutGrid`,
  `History`), os mesmos da barra lateral. Emoji não escala com o tema nem tem
  peso de traço; o vazio é parte do sistema, não um adesivo.
- Ganhou `onAction` (para vazios que abrem modal, não navegam),
  `secondaryLabel`/`onSecondary` e `variant="ghost"`.
- **Busca sem resultado usa `ghost`**: título "Nada encontrado", uma linha de
  ajuda e "Limpar filtros" sem peso de botão primário — não há o que criar ali.
  As quatro listagens passaram a mandar `onClearFilters` (a de categorias limpa
  só a busca, que é o único filtro dela).
- **Rotinas ganharam os dois vazios que faltavam**: na página, "Nenhuma rotina
  ainda" com "Criar rotina" (abre o modal, via `onAction`) e o secundário "ou
  peça ao Assistente", que dispara `openAgentPanel()`; no dashboard, a CTA
  passou a ser "Agendar rotina" em vez do genérico "Rotinas".
- `SnapshotEmptyState` deixou de ter markup próprio e passou pelo componente
  compartilhado.

### NOTIFY

- `lib/notify.tsx` é a casca única. O `ToastContainer` do `App` recebe
  `icon={ToastTypeIcon}` e `closeButton={ToastCloseButton}`, então **os
  `toast.*` antigos herdam o desenho novo sem precisar migrar chamada por
  chamada**; `notify.*` existe para quando há ícone da entidade ou subtítulo.
- Posição: `top-right` no desktop e `top-center` no telefone (`useIsDesktop`),
  no máximo `limit={3}`. O `closeOnClick` saiu: com × explícito, fechar sem
  querer ao tentar ler é pior que um clique a mais.
- O check-in do dashboard passou a mandar o **ícone do próprio hábito** com o
  nome no título e a frase motivacional no subtítulo. Antes era um check verde
  genérico com a frase solta, e a posição mudava por media query na mão.
- CSS: o `react-toastify` v11 se estende pelos tokens dele
  (`--toastify-toast-width`, `-padding`, `-bd-radius`, `-shadow`), então o
  bloco no `index.css` seta as variáveis no container em vez de duelar por
  especificidade. Duas exceções precisam de duas classes:
  `.Toastify__toast.beyou-toast` para o fundo (o tema claro dele pinta branco e
  vem depois no cascade) e o bloco `@media (max-width: 480px)`, que
  transformava a notificação em faixa colada no topo, de canto reto.
- Cronômetro: 2px, sem trilho (`--wrp` com altura 2px e `--bg` invisível), na
  cor do tom.

### Celebração

- O balão de 96px com "LV 3" dentro virou **o anel do sistema fechado com o
  número do nível no centro** — a mesma peça do check-in e da marca. Marco de
  sequência usa o mesmo anel com a chama e a contagem de dias.
- Ganhou "Continuar". O fechamento automático em 4s continua: o botão é uma
  saída, não a única.

## Convite dispensável e barra do celular (2026-08-07)

- **Convite de widgets fecha de vez**: `useDismissed(key)` guarda a recusa em
  `localStorage` sob `beyou-dismissed:<key>`. Preferência de tela não é dado de
  conta — não vale uma ida ao backend, e o `perfil` nem persiste. O × vive no
  `EmptyState` (`onDismiss`), então qualquer outro convite pode usá-lo.
- **O "Mais" parou de cobrir os atalhos**: painel e barra dividem o mesmo
  container fixo, empilhados; o escurecido fica atrás dos dois. A barra é a
  orientação de onde se está e some junto era desorientador. Veio com alça no
  topo, ícone em tile e o gatilho alternando (e aceso enquanto aberto).
- **Assistente mais alto**: `-mt-6` → `-mt-8`, com halo desfocado atrás. É o
  único alvo da barra que não é navegação, e o desenho tem de dizer isso.
- **Não seguido do mockup**: o ladrilho "Perfil" da sheet. A web não tem rota
  de perfil — ele é uma seção da configuração. Entraria como link morto.

## Expo: a passagem do redesign para o mobile (2026-08-07)

O app nativo tinha só a fundação do redesign (tokens, tipografia, marca,
primitivos, autenticação e a casca). As telas ainda eram do modelo anterior.
Esta rodada levou o desenho da web para elas, tela por tela.

### O que mudou de regra, não só de pixel

- **Hover não existe no toque.** Onde a web revela editar/excluir no hover, o
  mobile os deixa SEMPRE visíveis — que é o que a própria web faz abaixo de
  `md`. Vale para hábito, tarefa, categoria e meta.
- **O Alert nativo saiu de toda exclusão.** Ele não carrega tema, nem
  tipografia, nem o nome do item, e a ordem dos botões é da plataforma. O
  `DeleteModal` do mobile é o mesmo desenho da web. Ficou só o Alert de "dia já
  agendado" no `ScheduleSheet`, que não é exclusão.
- **A barra inferior não pode sumir.** O painel do "Mais" era um `Modal` —
  outra janela, que cobria os atalhos. Agora é irmão da barra, ancorado em
  `bottom: '100%'`, com o escurecido atrás dos dois.
- **Persistência local usa `expo-secure-store`.** Mesma escolha do
  `viewFiltersStore`: é a dependência nativa que já estava instalada, e trazer
  AsyncStorage forçaria rebuild. Vale para o convite de widgets dispensado e
  para as seções recolhidas por dia. Como a leitura é assíncrona, o
  `useDismissed` começa DISPENSADO e só libera depois de ler — ao contrário, um
  convite recusado piscaria a cada abertura.
- **Sem blur no RN.** O halo do assistente são dois discos translúcidos.
- **Sem `<select>`.** O `SelectField` é um controle com a casca dos inputs que
  abre uma sheet — mais confortável que um picker de roda numa lista de treze
  ordenações.

### Peças novas do lado nativo

`EmptyState`, `DeleteModal`, `SelectField`, `ListToolbar`, `AttributeChip`,
`BeyouToast` (+ o host que lê o inset de dentro do SafeAreaProvider),
`form/FormModal`, `form/FormField`, `ProfileHeaderRow`, `useDismissed`,
`lib/dismissedStore`, `lib/collapsedSections`, `ui/sortOptions` e a cópia de
`routineMetrics`.

`routineMetrics` é cópia literal da web: lógica pura sobre os tipos
compartilhados, vivendo nos dois apps até alguém movê-la para um pacote. Mexeu
num, mexa no outro.

### O que ficou de fora

- O ladrilho "Perfil" da sheet do "Mais" (nem web nem mobile têm rota de
  perfil — ele é uma seção da configuração).
- O `RoutineBuilder` e o `SectionCard` continuam no desenho anterior; só o
  seletor de itens da seção foi alinhado.
- O console de feedback do admin não existe no mobile.

## Paridade web ⟷ mobile, tela por tela (2026-08-08)

Passagem comparando a web a 390px (agent-browser) com o app no emulador,
página por página. O que apareceu só quando as duas ficaram lado a lado:

- **O chevron dos cartões não renderizava.** `transform: rotate` no `style` de
  um ícone `lucide-react-native` faz o SVG sumir — o `react-native-svg` não
  aceita o transform por ali. Onde a web rotaciona um chevron, o mobile agora
  TROCA o ícone (`ChevronRight`/`ChevronUp`). Valia para configuração, seção do
  dia e cartão de rotina.
- **O Hermes deste build não tem `Intl.PluralRules`.** Sem ele o i18next não
  acha `_one`/`_other` e cai na chave base — que em várias é só o rótulo, então
  "1 rotina" virava "Rotinas". `src/lib/pluralRulesPolyfill.ts` cobre os dois
  idiomas (en: one só para 1; pt: one para 0 e 1, como o CLDR) e é instalado
  antes do init. Só cardinal: nada no app usa ordinal.
- **O `Button` engolia `className`.** Ela caía no `...rest` e o spread
  substituía a className calculada, então quem passasse largura perdia o fundo
  junto. Silencioso e fácil de repetir; agora é desestruturada e mesclada.
- **O ícone de ação em repouso é `text-3` nos dois tons.** A lixeira vermelha
  no mobile gritava; na web o tom destrutivo só aparece no hover, e aqui só no
  fundo do toque.
- **Telas que ainda eram do modelo antigo**: perfil (campos sem rótulo, salvar
  centrado), idioma (caixinha EN|PT), rotinas (quatro números grandes + pílula
  de ordenação que a web não tem) e o cabeçalho do dashboard (avatar + anel de
  nível dentro de um cartão). Todas passaram para o desenho da web.
- **Duas coisas que faltavam nos dois lados**: metas sem o filtro de status no
  mobile, e o cartão de entidade criada do agente sem equivalente na web. O
  cartão foi PORTADO PARA A WEB — o mobile já resolvia o que eu havia anotado
  como inviável, derivando o destino do nome da ferramenta em vez do id da
  entidade.

### Diferenças que ficam de propósito

- O mobile tem um chevron de voltar no cabeçalho das telas; a web não precisa
  (sidebar no desktop, barra no telefone).
- O seletor de ícone é grade inline na web e sheet no mobile — a grade de seis
  colunas dentro de um formulário rolável não é o padrão do toque.
- O botão do assistente ficou mais alto na web (`-mt-8` → `-mt-11`) e mais
  baixo no nativo (`top: -18` → `-12`), a pedido.

## Tokens de cor do mobile: a forma importa (2026-08-08)

`bg-success` não pintava nada no app nativo — a barra da meta concluída ficava
com só o trilho, e o chip "Concluído" saía sem fundo. `bg-flame` e `bg-accent`,
no mesmo arquivo e na mesma linha, pintavam.

A causa era a forma do token no `tailwind.config.js` do mobile: `var(--x)` em
vez de `rgb(var(--x-rgb) / <alpha-value>)`. Sem os canais crus o Tailwind v3 não
emite as classes com barra, e o elemento fica SEM FUNDO — é literalmente o que
o comentário do `cssVars.ts` já avisava, e por isso o `themeToVars` publica cada
cor duas vezes. A web já usava a forma com canais; o mobile ficou para trás.

O config do mobile agora espelha o da web. Isso conserta de uma vez todas as
49 classes com barra que existiam no app (`bg-accent/10`, `bg-danger/10`,
`border-border/40`, …) e que silenciosamente não pintavam.

Lição para a próxima cor que nascer: token novo entra nos DOIS configs na forma
com canais, senão a variante de opacidade morre calada.

## Widgets do dashboard no nativo (2026-08-08)

Os sete widgets nativos ainda eram do desenho antigo: título grande centralizado,
pilha de largura cheia, e conteúdo que não batia com nada da web. Agora eles são
o espelho do `baseDiv`: cabeçalho de 12,5px em `text-2` com o ícone à esquerda,
`px-[18px] py-4`, e o dado abaixo.

O que mudou por widget:

- **Constância** — número em mono, "dias seguidos · melhor: N" e a faixa dos
  últimos 28 dias em duas fileiras de 14.
- **Hoje** (progresso diário) — anel de 108px com a porcentagem e "do dia", e ao
  lado o que ela significa: itens concluídos e **XP do dia** (de
  `getRoutineStats`, não `perfil.xp`, que é o acumulado da conta).
- **Melhor / Pior área** — tile colorido com o ícone da categoria, nome,
  `LV n · xp/next XP` em mono e a barra do nível (verde / chama).
- **Nível** — a barra fina com `xp` e `nextLevelXp` em mono nas pontas. Sem
  gradiente: no RN isso pediria uma lib de svg só para o degradê de 8px.
- **Dicas rápidas** — tile de lâmpada, a dica, e o rodapé "dica N de 8".
- **Equilíbrio de vida** — o mesmo radar da web (malha de dois anéis, série em
  acento translúcido, rótulos por fora com âncora dependendo do lado).

E os widgets viraram **carrossel com pontos de página**, como a web faz no
telefone: empilhados, cada widget novo empurrava a rotina e as metas para baixo.

Dois detalhes que só apareceram no aparelho:

- A faixa de constância saía **vazia**. Largura em porcentagem + `aspect-square`
  não dá altura ao quadrado no RN. O lado agora vem do `onLayout` da faixa — e
  arredondado PARA BAIXO no pixel físico, porque com valor fracionário o RN
  arredonda cada quadrado para cima, a fileira estoura a largura e o 14º cai para
  a linha de baixo (era 13 por fileira).
- Tentei fazer os cartões curtos crescerem até a altura do trilho com `flex-1`;
  `flex-1` traz `flex-basis: 0%` e, com o pai de altura automática, o cartão
  colapsou para nada. Ficou como na web: o trilho tem a altura do slide mais alto
  (o radar) e os curtos deixam um vão embaixo.

O carrossel mede a largura no `onLayout` em vez de usar `Dimensions`: o bloco
vive dentro do padding do dashboard, então a tela inteira daria um slide largo
demais. Isso torna a medida obrigatória no teste — `DashboardWidgets.test.tsx`
dispara o evento `layout` depois de montar.

## Verificação feita

- `npx tsc --noEmit` limpo nos dois apps.
- Suíte web e suíte mobile verdes a cada commit (contagem varia conforme testes
  foram atualizados junto do que mudou de propósito).
- `npm run build` do web gerando bundle, e a tela de login conferida por
  screenshot contra a seção Login do mockup.
- **`profile-persistence.spec.ts` vai falhar e precisa ser atualizada** (repo
  Beyou-e2e-tests, fora deste PR): ela semeia `theme: "Sunset"` e afirma que
  `--primary` fica `#FB923C`. Com o modelo novo, "Sunset" migra para
  `light:sunset` e o acento passa a ser **`#E45A0B`** — o valor do pack no
  mockup. A asserção precisa do valor novo; o comportamento testado (tema salvo
  sobrevive ao reload) continua válido.
- **Não rodei a suíte e2e** (`Beyou-e2e-tests`): ela precisa da stack completa
  (backend em perfil e2e + Postgres `beyou_e2e`) subida. É o próximo passo de
  verificação, e o risco mora nos seletores por texto da navegação.
