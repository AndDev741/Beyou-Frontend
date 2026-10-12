import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Repeat, Timer } from 'lucide-react-native';
import { blockFigure, blockTitle, blockTitleRoot, formatStudyMinutes } from '@beyou/state';
import type { TodayEntry } from '@beyou/types/notebook/studyCycle';
import WidgetCard from './WidgetCard';
import Button from '../Button';
import Ring from '../Ring';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useStudyToday } from '../../notebook/cycles/useStudyToday';
import { useStudyFocus } from '../../notebook/cycles/useStudyFocus';
import { factsOfEntry } from '../../notebook/cycles/StudyTodayCard';
import { figureText } from '../../notebook/cycles/cycleText';
import RootPrefix from '../../notebook/cycles/RootPrefix';

/** How many of the blocks after the current one the widget lists. */
const AHEAD = 2;

/**
 * Today's study on the dashboard, mirror of the web's `studyToday`: the ring of blocks closed
 * today, the block to start now with "Start focus" on its page, the next two, and the way to the
 * notebook. Self-fetching, like the mood week: nothing to pass from the dashboard.
 *
 * With no cycle it invites building one; on a day every cycle rests it says so.
 */
export default function StudyTodayWidget() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const { today, loaded, load } = useStudyToday();
  const focus = useStudyFocus();

  useEffect(() => {
    void load();
  }, [load]);

  const open = (
    <Pressable onPress={() => router.push('/notebook')} accessibilityRole="button" testID="study-widget-open">
      <Text className="text-[11.5px] font-medium text-text-3">{t('StudyCycleMobileOpenNotebook')}</Text>
    </Pressable>
  );

  const card = (children: React.ReactNode) => (
    <WidgetCard title={t('StudyCycleMobileWidgetTitle')} icon={<Repeat size={14.5} color={theme.text3} />} action={open} testID="study-today-widget">
      {children}
    </WidgetCard>
  );

  if (!today) {
    return card(
      <Text className="mt-3 text-[13px] text-text-2" testID="study-widget-loading">
        {loaded ? t('StudyCycleMobileWidgetUnavailable') : '…'}
      </Text>,
    );
  }

  if (today.cycles.length === 0) {
    const resting = today.restingCycles.length > 0;
    return card(
      <View className="mt-3 gap-2.5" testID={resting ? 'study-widget-resting' : 'study-widget-empty'}>
        <Text className="text-[13px] leading-[18px] text-text-2">
          {resting
            ? t('StudyCycleMobileResting', {
                count: today.restingCycles.length,
                names: today.restingCycles.map((cycle) => cycle.name).join(', '),
              })
            : t('StudyCycleMobileEmptyBody')}
        </Text>
        {resting ? null : (
          <Button
            text={t('StudyCycleMobileBuild')}
            mode="tonal"
            size="auto"
            className="self-start"
            onPress={() => router.push('/notebook-cycle-edit')}
            testID="study-widget-create"
          />
        )}
      </View>,
    );
  }

  const openEntries = today.cycles.flatMap((cycle) => cycle.entries.filter((entry) => !entry.doneToday));
  const current = openEntries[0];
  const ahead = openEntries.slice(1, 1 + AHEAD);

  return card(
    <View className="mt-3 gap-3">
      <View className="flex-row items-center gap-3.5">
        <Ring
          size={56}
          state="progress"
          progress={today.blocksTotal > 0 ? today.blocksDone / today.blocksTotal : 0}
          title={t('StudyCycleMobileBlocksOf', { done: today.blocksDone, count: today.blocksTotal })}
        />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[19px] font-semibold text-text" testID="study-widget-title">
            {t('StudyCycleMobileBlocksOf', { done: today.blocksDone, count: today.blocksTotal })}
          </Text>
          <Text className="text-[13px] text-text-2">
            {today.studiedMinutes > 0
              ? t('StudyCycleMobileStudiedToday', { time: formatStudyMinutes(today.studiedMinutes) })
              : t('StudyCycleMobileNothingYet', { time: formatStudyMinutes(today.plannedMinutes) })}
          </Text>
        </View>
      </View>

      {current ? (
        <View className="gap-2.5 rounded-xl border border-accent/30 bg-accent/5 p-3" testID="study-widget-current">
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className="min-w-0 flex-1 text-[14.5px] font-semibold text-text" numberOfLines={2}>
              {current.start ? `${current.start} · ` : null}
              <RootPrefix root={blockTitleRoot(current)} className="text-[12.5px]" />
              {blockTitle(current, t)}
            </Text>
            <Text className="text-[12px] font-semibold text-accent">{shortFigure(current, t)}</Text>
          </View>
          <Button
            text={t('StudyCycleMobileStartFocus')}
            mode="primary"
            size="auto"
            icon={<Timer size={16} color={theme.onAccent} />}
            onPress={() => focus(current)}
            testID="study-widget-focus"
          />
        </View>
      ) : (
        <Text className="text-[13px] font-semibold text-success" testID="study-widget-done">
          {t('StudyCycleMobileAllDone')}
        </Text>
      )}

      {ahead.length > 0 ? (
        <View>
          {ahead.map((entry, index) => (
            <View
              key={`${entry.blockId}-${entry.nextLap ? 'next' : 'this'}`}
              className={`flex-row items-center justify-between gap-2 py-1.5 ${index < ahead.length - 1 ? 'border-b border-border' : ''}`}
              testID="study-widget-ahead"
            >
              <Text className="min-w-0 flex-1 text-[13.5px] text-text" numberOfLines={1}>
                {entry.start ? <Text className="font-mono text-[12px] text-text-2">{`${entry.start}  `}</Text> : null}
                <RootPrefix root={blockTitleRoot(entry)} className="text-[12px]" />
                {blockTitle(entry, t)}
              </Text>
              <Text className="font-mono-semibold text-[12px] text-text-2">{formatStudyMinutes(entry.minutesToday)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>,
  );
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** The current block's figure in a few characters: "2 of 5" for a concept's subpages, minutes else. */
function shortFigure(entry: TodayEntry, t: Translate): string {
  if (entry.mode === 'GOAL' && entry.target && entry.target.progress.total > 1) {
    return t('StudyCycleMobileShortOf', { done: entry.target.progress.done, total: entry.target.progress.total });
  }
  if (entry.mode === 'GOAL' && entry.target) {
    return figureText(blockFigure(factsOfEntry(entry), { minutesToday: entry.minutesToday, current: true }), t).label;
  }
  return formatStudyMinutes(entry.minutesToday);
}
