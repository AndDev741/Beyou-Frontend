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

### 2. `userInterfaceStyle` do Expo estava fixo em `light`

Com isso `useColorScheme()` responderia claro para sempre e o modo "sistema"
nunca escureceria no app nativo. Passou para `automatic` no `app.json`.

### 3. Dependências de dados continuam de pé

Nada mudou desde a auditoria: as barras semanais de Melhor/Pior área, o recorde
de constância por hábito, o total de check-ins e o heatmap seguem sem dado na
API. Os componentes que os exibiriam foram escritos para **degradar sem o dado**
(escondem o elemento), não para inventar número.

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
- **Páginas de Rotinas, Hábitos, Tarefas, Metas e Categorias**: receberam os
  tokens, o raio e as bordas novas, mas o **layout** dessas páginas ainda é o
  antigo — a reorganização em grid escaneável com toolbar, descrição no cartão e
  tela estendida não entrou.
- **Onboarding e tutorial**: herdaram tokens e componentes, mas o reskin
  desenhado (scrim + anel do acento no spotlight, wizard com Ring de seleção)
  não foi feito.
- **Admin de feedback**: só tokens; os StatTiles e o split lista/detalhe do
  mockup não entraram.

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

## Verificação feita

- `npx tsc --noEmit` limpo nos dois apps.
- Suíte web e suíte mobile verdes a cada commit (contagem varia conforme testes
  foram atualizados junto do que mudou de propósito).
- `npm run build` do web gerando bundle, e a tela de login conferida por
  screenshot contra a seção Login do mockup.
- **Não rodei a suíte e2e** (`Beyou-e2e-tests`): ela precisa da stack completa
  (backend em perfil e2e + Postgres `beyou_e2e`) subida. É o próximo passo de
  verificação, e o risco mora nos seletores por texto da navegação.
