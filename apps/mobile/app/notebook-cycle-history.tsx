import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { ChevronLeft, ChevronRight, Target, Trash2, X } from 'lucide-react-native';
import { deleteStudySession, getStudyCycles, getStudyHistory } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { addDaysIso, enterStudyCycles, formatStudyMinutes, refreshStudyCycles } from '@beyou/state';
import type { HistoryEntry, StudyHistory, StudyHistoryDay } from '@beyou/types/notebook/studyCycle';
import Card from '../src/ui/Card';
import Chip from '../src/ui/Chip';
import IconButton from '../src/ui/IconButton';
import HeaderIconButton from '../src/notebook/cycles/HeaderIconButton';
import useTodayInZone from '../src/ui/useTodayInZone';
import { formatClock, formatIsoDay, mondayOf, topicColor, weekdayOfIso, weekdayLabel } from '../src/notebook/cycles/cycleText';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../src/store';

const BAR_HEIGHT = 140;

type ManualEntry = Extract<HistoryEntry, { kind: 'MANUAL' }>;

/**
 * A cycle's history, a week at a time: one bar per day stacked by topic with the day's target as
 * a dashed line, and the entries of the day picked under it: pomodoros, sessions logged by hand
 * (which can be deleted from here, taking their minutes back from the blocks), concepts
 * understood and laps closed.
 */
export default function NotebookCycleHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { id } = useLocalSearchParams<{ id: string }>();
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const cycleName = useSelector(
    (s: RootState) => (id ? s.studyCycles.byId[id]?.name ?? s.studyCycles.list.find((cycle) => cycle.id === id)?.name : undefined),
  );
  const today = useTodayInZone();
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [history, setHistory] = useState<StudyHistory | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const weekEnd = addDaysIso(weekStart, 6);
  const isCurrentWeek = weekStart >= mondayOf(today);

  const load = useCallback(async () => {
    if (!id) return;
    const response = await getStudyHistory(id, weekStart, addDaysIso(weekStart, 6), t);
    if (response.success) {
      setHistory(response.success);
      setFailed(false);
    } else {
      setFailed(true);
      notify.error(getFriendlyErrorMessage(t, response.error));
    }
  }, [id, t, weekStart]);

  useEffect(() => {
    setHistory(null);
    setSelected(null);
    void load();
  }, [load]);

  // Opened straight from a link: the name comes with the list.
  useEffect(() => {
    if (cycleName !== undefined) return;
    void getStudyCycles(t).then((response) => {
      if (response.success) dispatch(enterStudyCycles(response.success));
    });
  }, [cycleName, dispatch, t]);

  const days = useMemo(() => [...(history?.days ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [history]);
  const topicIndex = useMemo(() => new Map((history?.topics ?? []).map((topic, index) => [topic.id, index])), [history]);
  const colorOf = (topicId: string) => topicColor(topicIndex.get(topicId) ?? 0, theme);

  // Today when it is in this week, else the last day anything was studied, else the week's last.
  const shownDate =
    selected ??
    (today >= weekStart && today <= weekEnd ? today : [...days].reverse().find((day) => day.minutes > 0)?.date ?? weekEnd);
  const shownDay = days.find((day) => day.date === shownDate) ?? null;

  const totals = days.reduce(
    (sum, day) => ({
      minutes: sum.minutes + day.minutes,
      planned: sum.planned + day.plannedMinutes,
      understood: sum.understood + day.entries.filter((entry) => entry.kind === 'UNDERSTOOD').length,
    }),
    { minutes: 0, planned: 0, understood: 0 },
  );
  const scale = Math.max(60, ...days.map((day) => Math.max(day.minutes, day.plannedMinutes)));

  const removeSession = (entry: ManualEntry) => {
    Alert.alert(
      t('StudyCycleMobileDeleteSessionTitle'),
      t('StudyCycleMobileDeleteSessionBody', { minutes: formatStudyMinutes(entry.minutes), topic: entry.topic.title }),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Delete'), style: 'destructive', onPress: () => void confirmRemove(entry) },
      ],
    );
  };

  const confirmRemove = async (entry: ManualEntry) => {
    const response = await deleteStudySession(entry.sessionId, t);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    notify.success(t('StudyCycleMobileSessionDeleted'));
    await load();
    void refreshStudyCycles(dispatch, store.getState().studyCycles, t);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/notebook-cycles'));
  const range = `${formatIsoDay(weekStart, i18n.language, { day: 'numeric', month: 'short' })} – ${formatIsoDay(weekEnd, i18n.language, {
    day: 'numeric',
    month: 'short',
  })}`;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} testID="history-screen">
      <View className="flex-row items-start gap-1 px-2 pb-2 pt-1">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Close')} className="h-11 w-11 items-center justify-center" testID="history-close">
          <X size={20} color={theme.text} />
        </Pressable>
        <View className="min-w-0 flex-1 gap-0.5 pt-1">
          <Text className="text-[11.5px] font-semibold uppercase tracking-[1px] text-text-3" numberOfLines={1}>
            {cycleName ? t('StudyCycleMobileHistoryOf', { name: cycleName }) : t('StudyCycleMobileHistory')}
          </Text>
          {history ? (
            <Text accessibilityRole="header" className="text-[17px] font-semibold text-text" testID="history-title">
              {[
                t('StudyCycleMobileConceptsUnderstood', { count: totals.understood }),
                t('StudyCycleMobileStudiedOf', { studied: formatStudyMinutes(totals.minutes), planned: formatStudyMinutes(totals.planned) }),
              ].join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 pb-2">
        <HeaderIconButton label={t('StudyCycleMobilePreviousWeek')} onPress={() => setWeekStart(addDaysIso(weekStart, -7))} testID="history-previous">
          <ChevronLeft size={20} color={theme.text} />
        </HeaderIconButton>
        <Text className="text-[14px] font-semibold text-text" testID="history-range">
          {range}
        </Text>
        <HeaderIconButton
          label={t('StudyCycleMobileNextWeek')}
          disabled={isCurrentWeek}
          onPress={() => setWeekStart(addDaysIso(weekStart, 7))}
          testID="history-next"
        >
          <ChevronRight size={20} color={theme.text} />
        </HeaderIconButton>
      </View>

      {!history ? (
        <View className="flex-1 items-center justify-center" testID="history-loading">
          {failed ? <Text className="px-8 text-center text-[14px] text-text-2">{t('StudyCycleMobileHistoryFailed')}</Text> : <ActivityIndicator color={theme.accent} />}
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
          <Card className="gap-3" testID="history-bars">
            <View className="flex-row items-end justify-between gap-1">
              {days.map((day) => (
                <DayBar
                  key={day.date}
                  day={day}
                  scale={scale}
                  selected={day.date === shownDate}
                  colorOf={colorOf}
                  label={weekdayLabel(weekdayOfIso(day.date), i18n.language)}
                  caption={
                    day.plannedMinutes > 0
                      ? `${formatStudyMinutes(day.minutes)} / ${formatStudyMinutes(day.plannedMinutes)}`
                      : day.minutes > 0
                        ? formatStudyMinutes(day.minutes)
                        : t('StudyCycleMobileRest')
                  }
                  onPress={() => setSelected(day.date)}
                />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-x-3 gap-y-1.5" testID="history-legend">
              {history.topics.map((topic) => {
                const { color, opacity } = colorOf(topic.id);
                return (
                  <View key={topic.id} className="flex-row items-center gap-1.5">
                    <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color, opacity }} />
                    <Text className="text-[12px] text-text-2">{topic.title}</Text>
                  </View>
                );
              })}
              <View className="flex-row items-center gap-1.5">
                <View className="w-3.5 border-t border-dashed border-text-2" />
                <Text className="text-[12px] text-text-2">{t('StudyCycleMobileDayTarget')}</Text>
              </View>
            </View>
          </Card>

          {shownDay ? (
            <Card className="gap-2" testID="history-day">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="min-w-0 flex-1 text-[15px] font-semibold text-text">
                  {formatIsoDay(shownDay.date, i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text className="font-mono-semibold text-[12px] text-text-2">
                  {shownDay.plannedMinutes > 0
                    ? t('StudyCycleMobileStudiedOf', {
                        studied: formatStudyMinutes(shownDay.minutes),
                        planned: formatStudyMinutes(shownDay.plannedMinutes),
                      })
                    : formatStudyMinutes(shownDay.minutes)}
                </Text>
              </View>
              {shownDay.entries.length === 0 ? (
                <Text className="text-[13px] text-text-2" testID="history-day-empty">
                  {t('StudyCycleMobileNothingThatDay')}
                </Text>
              ) : (
                shownDay.entries.map((entry, index) => (
                  <EntryLine
                    key={`${entry.kind}-${entry.at}-${index}`}
                    entry={entry}
                    clock={formatClock(entry.at, i18n.language, timezone)}
                    colorOf={colorOf}
                    onDelete={removeSession}
                  />
                ))
              )}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

/** One day's column: the topics stacked from the bottom, the target dashed across it. */
function DayBar({
  day, scale, selected, colorOf, label, caption, onPress,
}: {
  day: StudyHistoryDay;
  scale: number;
  selected: boolean;
  colorOf: (topicId: string) => { color: string; opacity: number };
  label: string;
  caption: string;
  onPress: () => void;
}) {
  const height = (minutes: number) => Math.round((minutes / scale) * BAR_HEIGHT);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${caption}`}
      className={`flex-1 items-center gap-1 rounded-lg py-1.5 ${selected ? 'bg-accent/5' : ''}`}
      testID={`history-bar-${day.date}`}
    >
      <View style={{ height: BAR_HEIGHT }} className="w-6 justify-end">
        <View className="w-full gap-px overflow-hidden rounded-[5px]">
          {[...day.byTopic].reverse().map((part) => {
            const { color, opacity } = colorOf(part.topicId);
            return <View key={part.topicId} style={{ height: Math.max(2, height(part.minutes) - 1), backgroundColor: color, opacity }} />;
          })}
        </View>
        {day.plannedMinutes > 0 ? (
          <View
            className="absolute border-t border-dashed border-text-2"
            style={{ left: -4, right: -4, bottom: height(day.plannedMinutes) }}
            testID={`history-target-${day.date}`}
          />
        ) : null}
      </View>
      <Text className={`text-[12px] font-semibold ${selected ? 'text-accent' : 'text-text'}`}>{label}</Text>
      <Text className="text-center text-[10px] leading-3 text-text-3" numberOfLines={2}>
        {caption}
      </Text>
    </Pressable>
  );
}

/** One entry of the day: a pomodoro, a session logged by hand, a concept understood, a lap. */
function EntryLine({
  entry, clock, colorOf, onDelete,
}: {
  entry: HistoryEntry;
  clock: string;
  colorOf: (topicId: string) => { color: string; opacity: number };
  onDelete: (entry: ManualEntry) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  if (entry.kind === 'LAP_CLOSED') {
    return (
      <View className="flex-row items-center gap-2 py-1.5" testID="history-entry-lap">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-[12px] font-semibold text-text-2">
          {t('StudyCycleMobileLapClosedAt', { number: entry.lapNumber, time: clock, next: entry.lapNumber + 1 })}
        </Text>
        <View className="h-px flex-1 bg-border" />
      </View>
    );
  }

  if (entry.kind === 'UNDERSTOOD') {
    return (
      <View className="flex-row items-center gap-2 rounded-lg bg-success/10 px-3 py-2" testID="history-entry-understood">
        <Target size={15} color={theme.success} />
        <Text className="min-w-0 flex-1 text-[13px] font-semibold text-success">
          {t('StudyCycleMobileUnderstoodLine', {
            title: entry.page?.title ?? entry.topic.title,
            minutes: formatStudyMinutes(entry.minutes),
          })}
        </Text>
      </View>
    );
  }

  const { color, opacity } = colorOf(entry.topic.id);
  const manual = entry.kind === 'MANUAL';
  const detail = manual ? [entry.page?.title, entry.note].filter(Boolean).join(' · ') : entry.page?.title ?? '';
  return (
    <View className="flex-row items-center gap-2.5 py-1.5" testID={manual ? 'history-entry-manual' : 'history-entry-focus'}>
      <Text className="w-11 font-mono text-[12px] text-text-2">{clock}</Text>
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity }} />
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-semibold text-text" numberOfLines={1}>
          {entry.topic.title}
        </Text>
        {detail ? (
          <Text className="text-[12px] text-text-2" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Chip size="sm" variant={manual ? 'xp' : 'accent'}>
        {t(manual ? 'StudyCycleMobileSourceManual' : 'StudyCycleMobileSourceFocus')}
      </Chip>
      <Text className="font-mono-semibold text-[12px] text-text">{`${entry.minutes} min`}</Text>
      {manual ? (
        <IconButton label={t('StudyCycleMobileDeleteSession', { topic: entry.topic.title })} tone="danger" onPress={() => onDelete(entry)} testID="history-entry-delete">
          <Trash2 size={15} color={theme.text2} />
        </IconButton>
      ) : null}
    </View>
  );
}
