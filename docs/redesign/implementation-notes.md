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
