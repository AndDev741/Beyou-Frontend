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
