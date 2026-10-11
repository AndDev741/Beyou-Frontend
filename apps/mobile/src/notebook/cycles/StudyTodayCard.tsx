import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Repeat, RotateCw, Timer } from 'lucide-react-native';
import { blockFigure, blockTitle, formatStudyMinutes, isConceptBlock } from '@beyou/state';
import type { StudyToday, StudyTodayCycle, TodayEntry } from '@beyou/types/notebook/studyCycle';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import IconTile from '../../ui/IconTile';
import ProgressBar from '../ProgressBar';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import FigureBar, { FIGURE_TEXT } from './FigureBar';
import { blockSubline, figureText, formatIsoDay, studyPageOf } from './cycleText';
import { useStudyFocus } from './useStudyFocus';

interface StudyTodayCardProps {
  today: StudyToday | null;
  onLogSession: () => void;
  onOpenCycles: () => void;
  onCreateCycle: () => void;
  onOpenPage: (pageId: string) => void;
}

/**
 * "Today" on the notebook home: per cycle that has minutes today, the slice of its queue that fits
 * the day, with clock times when the day has a start time. The first open block of each cycle is
 * the one to start, so it carries "Focus 25" and "Open"; the rest are one line each.
 *
 * Nothing to show before the first read. No cycle at all is a small invitation to build one; a
 * day every cycle rests is one line.
 */
export default function StudyTodayCard({ today, onLogSession, onOpenCycles, onCreateCycle, onOpenPage }: StudyTodayCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  if (!today) return null;

  if (today.cycles.length === 0 && today.restingCycles.length === 0) {
    return (
      <Card className="gap-3" testID="study-today-empty">
        <View className="flex-row items-center gap-3">
          <IconTile size={40}>
            <Repeat size={20} color={theme.accent} />
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileEmptyTitle')}</Text>
            <Text className="text-[13px] leading-[18px] text-text-2">{t('StudyCycleMobileEmptyBody')}</Text>
          </View>
        </View>
        <Button text={t('StudyCycleMobileBuild')} mode="tonal" size="block" onPress={onCreateCycle} testID="study-today-create" />
      </Card>
    );
  }

  const date = formatIsoDay(today.date, i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });
  const restingLine =
    today.restingCycles.length > 0
      ? t('StudyCycleMobileResting', {
          count: today.restingCycles.length,
          names: today.restingCycles.map((cycle) => cycle.name).join(', '),
        })
      : null;

  return (
    <Card className="gap-3" testID="study-today-card">
      <View className="flex-row items-end justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[11.5px] font-semibold uppercase tracking-[1px] text-text-3">
            {t('StudyCycleMobileTodayEyebrow', { date })}
          </Text>
          {today.cycles.length > 0 ? (
            <Text accessibilityRole="header" className="text-[18px] font-semibold text-text" testID="study-today-title">
              {todayTitle(today, t)}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onOpenCycles} accessibilityRole="button" className="py-2.5" testID="study-today-cycles">
          <Text className="text-[13px] font-semibold text-accent">{t('StudyCycleMobileSeeCycles')}</Text>
        </Pressable>
      </View>
      {today.cycles.length > 0 ? (
        <ProgressBar share={today.blocksTotal > 0 ? today.blocksDone / today.blocksTotal : 0} />
      ) : null}

      {today.cycles.map((cycle) => (
        <CycleGroup key={cycle.cycleId} cycle={cycle} onOpenPage={onOpenPage} />
      ))}

      {restingLine ? (
        <Text className="text-[13px] text-text-2" testID="study-today-resting">
          {restingLine}
        </Text>
      ) : null}

      <Button
        text={t('StudyCycleMobileLogSession')}
        mode="default"
        size="block"
        icon={<Plus size={16} color={theme.text} />}
        onPress={onLogSession}
        testID="study-today-log"
      />
    </Card>
  );
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** "1 of 4 blocks · 1h studied", the studied part only once there is some. */
export function todayTitle(today: Pick<StudyToday, 'blocksDone' | 'blocksTotal' | 'studiedMinutes'>, t: Translate): string {
  const blocks = t('StudyCycleMobileBlocksOf', { done: today.blocksDone, count: today.blocksTotal });
  return today.studiedMinutes > 0
    ? `${blocks} · ${t('StudyCycleMobileStudied', { time: formatStudyMinutes(today.studiedMinutes) })}`
    : blocks;
}

/** The first entry still to study, the one that gets the buttons. */
export const firstOpenEntry = (cycle: StudyTodayCycle): TodayEntry | undefined =>
  cycle.entries.find((entry) => !entry.doneToday);

/** The facts a "Today" entry gives `blockFigure`. */
export const factsOfEntry = (entry: TodayEntry) => ({
  topic: entry.topic,
  mode: entry.mode,
  plannedMinutes: entry.plannedMinutes,
  minutes: entry.credited,
  state: entry.state,
  target: entry.target,
  targetPreview: entry.targetPreview,
  requireQuiz: entry.requireQuiz,
  quizPassed: entry.quizPassed,
});

function CycleGroup({ cycle, onOpenPage }: { cycle: StudyTodayCycle; onOpenPage: (pageId: string) => void }) {
  const { t } = useTranslation();
  const current = firstOpenEntry(cycle);
  const timed = cycle.startTime !== null;
  const header = [
    cycle.name,
    cycle.startTime,
    current && !current.nextLap ? t('StudyCycleMobileBlockOfLap', { position: current.position, total: cycle.blocksInLap }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="gap-2" testID="study-today-cycle">
      <Text className="text-[12px] font-semibold text-text-2" numberOfLines={1}>
        {header}
      </Text>
      {cycle.entries.map((entry) =>
        entry.doneToday ? (
          <DoneRow key={`${entry.blockId}-done`} entry={entry} />
        ) : entry === current ? (
          <CurrentEntry key={entry.blockId} entry={entry} timed={timed} onOpenPage={onOpenPage} />
        ) : (
          <EntryRow key={`${entry.blockId}-${entry.nextLap ? 'next' : 'this'}`} entry={entry} timed={timed} />
        ),
      )}
    </View>
  );
}

function entrySub(entry: TodayEntry, t: Translate): string {
  const sub = blockSubline(entry, t);
  return entry.nextLap ? [t('StudyCycleMobileNextLap'), sub].filter(Boolean).join(' · ') : sub;
}

/** A block closed today: a tick, its title, what it took. */
function DoneRow({ entry }: { entry: TodayEntry }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  // A turn that ran out closed the block too, but nothing was finished: no tick for it.
  const finished = entry.state !== 'TURN_USED';
  const sub = finished ? blockSubline(entry, t) : t('StudyCycleMobileTurnUsedToday');
  return (
    <View className="flex-row items-center gap-2.5 rounded-xl border border-border px-3 py-2.5" testID="study-today-done">
      <View className={`h-[30px] w-[30px] items-center justify-center rounded-[9px] ${finished ? 'bg-success/10' : 'bg-surface-2'}`}>
        {finished ? <Check size={16} color={theme.success} /> : <RotateCw size={15} color={theme.text2} />}
      </View>
      <View className="min-w-0 flex-1 gap-px">
        <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>
          {blockTitle(entry, t)}
        </Text>
        {sub ? (
          <Text className="text-[12px] text-text-2" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text className={`font-mono-semibold text-[12px] ${finished ? 'text-success' : 'text-text-2'}`}>
        {`${entry.credited}/${entry.plannedMinutes}`}
      </Text>
    </View>
  );
}

/** A block still to come today: its time, title and today's share of it. */
function EntryRow({ entry, timed }: { entry: TodayEntry; timed: boolean }) {
  const { t } = useTranslation();
  const minutes = formatStudyMinutes(entry.minutesToday);
  return (
    <View className="flex-row items-center gap-2.5 rounded-xl border border-border px-3 py-2.5" testID="study-today-entry">
      {timed ? <Text className="w-11 font-mono text-[12px] text-text-2">{entry.start ?? ''}</Text> : null}
      <View className="min-w-0 flex-1 gap-px">
        <Text className="text-[14px] font-semibold text-text" numberOfLines={2}>
          {blockTitle(entry, t)}
        </Text>
        <Text className="text-[12px] text-text-2" numberOfLines={2}>
          {entrySub(entry, t)}
        </Text>
      </View>
      <Text className="font-mono-semibold text-[12px] text-text">{isConceptBlock(entry) ? `~${minutes}` : minutes}</Text>
    </View>
  );
}

/** The block to start now: its figure in full, "Focus 25" on its page and "Open". */
function CurrentEntry({ entry, timed, onOpenPage }: { entry: TodayEntry; timed: boolean; onOpenPage: (pageId: string) => void }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const focus = useStudyFocus();
  const figure = blockFigure(factsOfEntry(entry), { minutesToday: entry.minutesToday, current: true });
  const { label, caption } = figureText(figure, t);

  return (
    <View className="gap-2.5 rounded-xl border border-accent/40 bg-accent/5 p-3" testID="study-today-current">
      <View className="flex-row items-start gap-2.5">
        {timed ? <Text className="w-11 pt-0.5 font-mono-semibold text-[12px] text-accent">{entry.start ?? ''}</Text> : null}
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold text-text">{blockTitle(entry, t)}</Text>
          <Text className="text-[12px] leading-4 text-text-2">{entrySub(entry, t)}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2.5">
        <View className="flex-1">
          <FigureBar share={figure.share} tone={figure.tone} />
        </View>
        <Text className={`text-[12px] font-semibold ${FIGURE_TEXT[figure.tone]}`} testID="study-today-current-figure">
          {label}
        </Text>
      </View>
      {caption ? <Text className="text-[12px] text-text-2">{caption}</Text> : null}
      <View className="flex-row gap-2">
        <Button
          text={t('StudyCycleMobileFocus25')}
          mode="primary"
          size="auto"
          className="flex-1"
          icon={<Timer size={16} color={theme.onAccent} />}
          onPress={() => focus(entry)}
          testID="study-today-focus"
        />
        <Button
          text={t('NotebookMobileOpen')}
          mode="default"
          size="auto"
          onPress={() => onOpenPage(studyPageOf(entry).id)}
          testID="study-today-open"
        />
      </View>
    </View>
  );
}
