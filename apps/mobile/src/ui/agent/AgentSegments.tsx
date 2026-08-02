import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Folder,
  ListChecks,
  Repeat,
  Settings,
  Trophy,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { agentSegment } from '@beyou/types/agent/chatType';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import IconTile from '../IconTile';
import AgentMarkdown from './AgentMarkdown';

type OnInternalLink = (href: string) => void;

/**
 * Ferramentas de LEITURA: viram um chip discreto ("Rotinas consultadas"), que é
 * tudo o que o usuário precisa saber sobre elas. Todo o resto escreve algo, e
 * escrita vira cartão com link para conferir o que o agente fez.
 */
const READ_TOOLS = new Set([
  'getUserHabits',
  'getUserCategories',
  'getUserTasks',
  'getUserGoals',
  'getUserRoutines',
  'getTodayRoutine',
  'getUserSchedules',
  'getUserConfiguration',
]);

/** Destino de cada ferramenta de escrita: rota + ícone + rótulo do link. */
type Destination = { route: string; Icon: LucideIcon; labelKey: string };

const DESTINATIONS: { match: RegExp; destination: Destination }[] = [
  { match: /Habit/, destination: { route: '/habits', Icon: Repeat, labelKey: 'Habits' } },
  { match: /Category/, destination: { route: '/categories', Icon: Folder, labelKey: 'Categories' } },
  { match: /Task/, destination: { route: '/tasks', Icon: ListChecks, labelKey: 'Tasks' } },
  { match: /Goal/, destination: { route: '/goals', Icon: Trophy, labelKey: 'Goals' } },
  {
    match: /Routine|Schedule/,
    destination: { route: '/routines', Icon: CalendarDays, labelKey: 'Routines' },
  },
  {
    match: /Configuration/,
    destination: { route: '/configuration', Icon: Settings, labelKey: 'Config' },
  },
];

// Nomes que citam DUAS entidades (`addTaskToRoutineSection`) casariam a regex
// errada primeiro; o que o usuário quer conferir nesses casos é a rotina.
// `updateGlobalContext` / `updateChatContext` ficam de fora de propósito: a
// memória do agente não tem tela para "ver", então elas viram chip.
const ROUTINE_ITEM_TOOLS = new Set([
  'addTaskToRoutineSection',
  'addHabitToRoutineSection',
  'removeRoutineItem',
]);

export function destinationFor(tool: string | undefined): Destination | null {
  if (!tool) return null;
  if (ROUTINE_ITEM_TOOLS.has(tool)) {
    return { route: '/routines', Icon: CalendarDays, labelKey: 'Routines' };
  }
  return DESTINATIONS.find(({ match }) => match.test(tool))?.destination ?? null;
}

/** Ferramenta de leitura, em andamento ou falha: um chip discreto. */
function ToolChip({ segment }: { segment: agentSegment }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const label = t(`AgentTool.${segment.tool}`, segment.tool ?? '');
  const failed = !!segment.error;
  const running = segment.status === 'started';

  return (
    <View
      className={`flex-row items-center gap-2 self-start rounded-full border px-3 py-1.5 ${
        failed ? 'border-danger/30 bg-danger/10' : 'border-border'
      }`}
    >
      {running ? (
        <ActivityIndicator size="small" color={theme.accent} />
      ) : failed ? (
        <X size={13} color={theme.danger} />
      ) : (
        <Check size={13} color={theme.success} />
      )}
      <Text className={`font-mono text-[11px] ${failed ? 'text-danger' : 'text-text-2'}`}>
        {label}
        {failed ? ` · ${t('AgentToolFailed')}` : ''}
      </Text>
    </View>
  );
}

/**
 * Entidade criada ou alterada: cartão com ícone, o que aconteceu e o link para
 * a seção onde ela vive — o usuário confere o que o agente fez num toque.
 *
 * O rótulo do link é o nome da seção de destino porque a ferramenta só reporta
 * o DOMÍNIO que tocou, não o nome da entidade: prometer "ver a meta X" com um
 * dado que não temos seria inventar.
 */
function ToolActionCard({
  segment,
  destination,
  onInternalLink,
}: {
  segment: agentSegment;
  destination: Destination;
  onInternalLink?: OnInternalLink;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { Icon } = destination;
  const label = t(`AgentTool.${segment.tool}`, segment.tool ?? '');
  const target = t(destination.labelKey);

  return (
    <View className="max-w-[92%] flex-row items-center gap-2.5 self-start rounded-card border border-border bg-bg px-3 py-2.5">
      <IconTile size={32}>
        <Icon size={16} color={theme.accent} />
      </IconTile>
      <Text className="min-w-0 flex-1 text-[13px] font-semibold text-text">{label}</Text>
      {onInternalLink ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={target}
          onPress={() => onInternalLink(destination.route)}
          className="flex-row items-center gap-0.5 rounded-control px-1 py-0.5 active:bg-surface-2"
        >
          <Text className="text-[11px] font-semibold text-accent">{target}</Text>
          <ChevronRight size={13} color={theme.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ToolSegment({
  segment,
  onInternalLink,
}: {
  segment: agentSegment;
  onInternalLink?: OnInternalLink;
}) {
  const destination = destinationFor(segment.tool);
  const isWrite =
    !!segment.tool &&
    !READ_TOOLS.has(segment.tool) &&
    segment.status !== 'started' &&
    !segment.error &&
    !!destination;

  return isWrite ? (
    <ToolActionCard
      segment={segment}
      destination={destination as Destination}
      onInternalLink={onInternalLink}
    />
  ) : (
    <ToolChip segment={segment} />
  );
}

/**
 * Renders an assistant turn as its ordered segments — text as markdown, tools
 * as chips (reads, in-flight, failures) or action cards (writes), interleaved
 * as they happened. Live streaming and persisted.
 */
export default function AgentSegments({
  segments,
  onInternalLink,
}: {
  segments: agentSegment[];
  onInternalLink?: OnInternalLink;
}) {
  return (
    <View className="gap-2">
      {segments.map((segment, index) =>
        segment.type === 'tool' ? (
          <ToolSegment key={index} segment={segment} onInternalLink={onInternalLink} />
        ) : (
          <AgentMarkdown key={index} text={segment.text ?? ''} onInternalLink={onInternalLink} />
        ),
      )}
    </View>
  );
}
