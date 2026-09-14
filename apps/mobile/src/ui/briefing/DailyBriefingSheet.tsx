import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  ChevronDown,
  Clock,
  Flame,
  History,
  Moon,
  Sunrise,
  Target,
} from 'lucide-react-native';
import {
  BRIEFING_PAGES,
  groupOpenItemsByDay,
  recoveryIsUrgent,
  type BriefingPage,
} from '@beyou/state';
import type { BriefingOpenItem, DailyBriefing } from '@beyou/types/briefing/briefing';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import BeyouIcon from '../BeyouIcon';
import BriefingOpenItemRow from './BriefingOpenItemRow';

interface Props {
  briefing: DailyBriefing;
  visible: boolean;
  onClose: () => void;
  onResolve: (item: BriefingOpenItem, outcome: 'checked' | 'skipped') => void;
  pendingId: string | null;
  locale: string;
}

const PAGE_LABEL: Record<BriefingPage, string> = {
  today: 'BriefingPageToday',
  yesterday: 'BriefingPageYesterday',
};

function shortDate(iso: string, locale: string): string {
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

function trim(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

/**
 * The new-day dialog, as a sheet.
 *
 * Same two halves as the web and the same order, stacked rather than columned: a phone has
 * no room for the split, and the actionable half has to lead whatever the axis. That makes
 * the native layout identical to the web's own sub-`lg` layout, which is the point — one
 * feature, two renderings, not two features.
 *
 * Nothing moves the right half on its own. A timed flip would compete with the one thing the
 * panel is for: the prose arrives from an LLM whenever it arrives, so the reader most likely
 * to be mid-sentence when a timer fires is exactly the one who just got something worth
 * reading. The tabs are therefore labelled rather than dots — they are the only way through,
 * and two words say so where two circles do not.
 */
export default function DailyBriefingSheet({
  briefing,
  visible,
  onClose,
  onResolve,
  pendingId,
  locale,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [page, setPage] = useState<BriefingPage>('today');
  const [olderOpen, setOlderOpen] = useState(false);

  const { yesterday } = briefing;
  const recovery = briefing.today.recovery;
  const urgent = recoveryIsUrgent(briefing);

  const rows = (items: BriefingOpenItem[]) =>
    items.map((item) => (
      <BriefingOpenItemRow
        key={item.snapshotCheckId}
        item={item}
        busy={pendingId === item.snapshotCheckId}
        onCheck={() => onResolve(item, 'checked')}
        onSkip={() => onResolve(item, 'skipped')}
      />
    ));

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="DailyBriefingClose">
      <View className="rounded-t-frame bg-surface px-4 pb-4 pt-5" testID="daily-briefing">
        <Text className="text-lg font-semibold text-text">{t('DailyBriefingTitle')}</Text>

        <ScrollView className="mt-4" contentContainerStyle={{ gap: 20 }}>
          {/* --- the half you can act on --- */}
          <View testID="briefing-yesterday">
            <View className="flex-row items-center gap-2">
              <CalendarCheck size={15} color={theme.text3} />
              <Text className="text-sm font-semibold text-text">
                {t('BriefingYesterdayHeading')}
              </Text>
              {yesterday.hadRoutine && (
                <Text className="ml-auto text-[11px] text-text-3">
                  {t('BriefingYesterdaySummary', {
                    done: yesterday.doneCount,
                    skipped: yesterday.skippedCount,
                  })}
                </Text>
              )}
            </View>

            {!yesterday.hadRoutine ? (
              <EmptyNote
                icon={<Moon size={18} color={theme.text3} />}
                title={t('BriefingNoRoutineTitle')}
                body={t('BriefingNoRoutineBody')}
              />
            ) : yesterday.openItems.length === 0 ? (
              <EmptyNote
                icon={<CalendarCheck size={18} color={theme.accent} />}
                title={t('BriefingYesterdayEmptyTitle')}
                body={t('BriefingYesterdayEmptyBody')}
                tone="success"
                accent={theme.accent}
              />
            ) : (
              <>
                <View className="mt-3" style={{ gap: 8 }}>
                  {rows(yesterday.openItems)}
                </View>
                <Text className="mt-2.5 text-xs leading-5 text-text-3">
                  {t('BriefingXpDecayNote')}
                </Text>
              </>
            )}

            {recovery && (
              <View className="mt-4 border-t border-border pt-3">
                <Pressable
                  onPress={() => setOlderOpen((value) => !value)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: olderOpen }}
                  testID="briefing-older-toggle"
                  className="flex-row items-center gap-2 rounded-control px-1 py-1 active:bg-surface-2"
                >
                  <Clock size={14} color={urgent ? theme.flame : theme.text3} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-medium text-text-2">
                      {t('BriefingOlderDaysToggle', { count: recovery.openItems.length })}
                    </Text>
                    <Text
                      className="mt-0.5 text-[11px]"
                      style={{ color: urgent ? theme.flame : theme.text3 }}
                    >
                      {urgent
                        ? t('BriefingOlderDaysLastChance', {
                            date: shortDate(recovery.oldestOpenDay, locale),
                          })
                        : t('BriefingOlderDaysDeadline', {
                            date: shortDate(recovery.oldestOpenDay, locale),
                            days: recovery.daysUntilExpiry,
                          })}
                    </Text>
                  </View>
                  <ChevronDown size={15} color={theme.text3} />
                </Pressable>

                {/* Grouped by day, not a flat list with a date on every row. "Did I do
                    this?" is a question about a DAY, and a week of a full routine is dozens
                    of items — the same six dates repeated down the list is noise to read
                    past rather than structure to scan. */}
                {olderOpen &&
                  groupOpenItemsByDay(recovery.openItems).map((group) => {
                    const expiring = group.date === recovery.oldestOpenDay;
                    return (
                      <View key={group.date} className="mt-3">
                        <View
                          className="flex-row items-center gap-2"
                          testID={`briefing-day-${group.date}`}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: expiring && urgent ? theme.flame : theme.text2 }}
                          >
                            {shortDate(group.date, locale)}
                          </Text>
                          <Text className="text-[11px] text-text-3">{group.items.length}</Text>
                          {expiring && urgent ? (
                            <Text
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                              style={{ color: theme.flame, backgroundColor: `${theme.flame}1A` }}
                            >
                              {t('BriefingDayExpiring')}
                            </Text>
                          ) : null}
                        </View>
                        <View className="mt-2" style={{ gap: 8 }}>
                          {rows(group.items)}
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>

          {/* --- the half you read --- */}
          <View className="border-t border-border pt-5" testID="briefing-carousel">
            {page === 'today' ? (
              <TodayPage briefing={briefing} locale={locale} theme={theme} />
            ) : (
              <RecapPage briefing={briefing} theme={theme} />
            )}

            <View className="mt-4 flex-row items-center gap-1 border-t border-border pt-3">
              {BRIEFING_PAGES.map((key) => {
                const active = key === page;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setPage(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    testID={`briefing-bullet-${key}`}
                    className={`rounded-control px-3 py-1.5 ${active ? 'bg-accent-soft' : ''}`}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: active ? theme.accent : theme.text3 }}
                    >
                      {t(PAGE_LABEL[key])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View className="mt-4 border-t border-border pt-4">
          <Button
            text={t('DailyBriefingDone')}
            onPress={onClose}
            mode="primary"
            size="block"
            testID="briefing-done"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

type ThemeShape = ReturnType<typeof useBeyouTheme>['theme'];

function TodayPage({
  briefing,
  locale,
  theme,
}: {
  briefing: DailyBriefing;
  locale: string;
  theme: ThemeShape;
}) {
  const { t } = useTranslation();
  const { today } = briefing;
  const atBest = today.currentStreak > 0 && today.currentStreak >= today.bestStreak;

  return (
    <View testID="briefing-today-page">
      <View className="flex-row items-center gap-2">
        <Sunrise size={15} color={theme.text3} />
        <Text className="text-sm font-semibold text-text">{t('BriefingTodayHeading')}</Text>
      </View>

      <Text className="mt-2 text-sm text-text-2">
        {today.scheduledToday
          ? t('BriefingScheduledItems', { count: today.scheduledItemCount })
          : t('BriefingNothingScheduled')}
      </Text>

      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Flame size={14} color={today.currentStreak > 0 ? theme.flame : theme.text3} />
        <Text className="flex-1 text-sm text-text-2">
          {today.currentStreak === 0
            ? t('BriefingNoStreak')
            : atBest
              ? t('BriefingStreakAtBest', { days: today.currentStreak })
              : t('BriefingStreakStanding', {
                  days: today.currentStreak,
                  best: today.bestStreak,
                })}
        </Text>
      </View>

      <NarrativeLines briefing={briefing} lines={briefing.narrative.todayLines} />

      {today.goalsApproaching.length > 0 && (
        <View className="mt-4">
          <View className="flex-row items-center gap-2">
            <Target size={14} color={theme.text3} />
            <Text className="text-xs font-semibold text-text-2">{t('BriefingGoalsHeading')}</Text>
          </View>

          <View className="mt-2.5" style={{ gap: 8 }}>
            {today.goalsApproaching.map((goal) => {
              const overdue = goal.daysRemaining < 0;
              return (
                <View
                  key={goal.id}
                  testID="briefing-goal"
                  className="rounded-control border border-border bg-surface p-3"
                >
                  <View className="flex-row items-center gap-2">
                    <BeyouIcon id={goal.iconId} size={15} color={theme.text2} showFallback />
                    <Text numberOfLines={1} className="flex-1 text-sm font-medium text-text">
                      {goal.name}
                    </Text>
                    <Text
                      className="text-[11px]"
                      style={{ color: overdue ? theme.danger : theme.text3 }}
                    >
                      {overdue
                        ? t('BriefingGoalOverdue', { count: Math.abs(goal.daysRemaining) })
                        : goal.daysRemaining === 0
                          ? t('BriefingGoalDueToday')
                          : t('BriefingGoalDaysLeft', { count: goal.daysRemaining })}
                    </Text>
                  </View>

                  <View className="mt-2 flex-row items-center gap-2">
                    <View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <View
                        style={{
                          width: `${goal.percentComplete}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: overdue ? theme.danger : theme.accent,
                        }}
                      />
                    </View>
                    <Text className="text-[11px] text-text-3">
                      {t('BriefingGoalProgress', {
                        current: trim(goal.currentValue, locale),
                        target: trim(goal.targetValue, locale),
                        unit: goal.unit,
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function RecapPage({ briefing, theme }: { briefing: DailyBriefing; theme: ThemeShape }) {
  const { t } = useTranslation();
  const { yesterday } = briefing;

  const lines: string[] = [];
  if (yesterday.complete) lines.push(t('BriefingRecapComplete'));
  lines.push(
    yesterday.xpEarned >= 1
      ? t('BriefingRecapXp', { xp: Math.round(yesterday.xpEarned) })
      : t('BriefingRecapNoXp'),
  );
  if (yesterday.openItems.length > 0) {
    lines.push(t('BriefingRecapMissed', { count: yesterday.openItems.length }));
  }
  if (yesterday.focusCycles > 0) {
    lines.push(t('BriefingRecapFocus', { count: yesterday.focusCycles }));
  }
  if (yesterday.moodLevel !== null) {
    lines.push(t('BriefingRecapMood', { mood: yesterday.moodLevel }));
  }

  return (
    <View testID="briefing-recap-page">
      <View className="flex-row items-center gap-2">
        <History size={15} color={theme.text3} />
        <Text className="text-sm font-semibold text-text">{t('BriefingRecapHeading')}</Text>
      </View>

      {yesterday.hadRoutine ? (
        <View className="mt-2" style={{ gap: 4 }}>
          {lines.map((line) => (
            <Text key={line} className="text-sm text-text-2">
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text className="mt-2 text-sm text-text-2">{t('BriefingNoRoutineBody')}</Text>
      )}

      <NarrativeLines briefing={briefing} lines={briefing.narrative.yesterdayLines} />
    </View>
  );
}

/**
 * The generated prose, or an honest stand-in.
 *
 * No shimmer skeleton here, unlike the web. A sheet is already a transient surface and a
 * pulsing placeholder inside one reads as the sheet itself loading; the single quiet line
 * says the same thing without the noise.
 */
function NarrativeLines({ briefing, lines }: { briefing: DailyBriefing; lines: string[] }) {
  const { t } = useTranslation();

  if (lines.length > 0) {
    return (
      <View className="mt-3" style={{ gap: 6 }} testID="briefing-narrative">
        {lines.map((line) => (
          <Text key={line} className="text-sm leading-5 text-text-2">
            {line}
          </Text>
        ))}
      </View>
    );
  }

  if (briefing.narrative.status === 'PENDING') {
    return (
      <Text className="mt-3 text-xs text-text-3" testID="briefing-narrative-pending">
        {t('BriefingNarrativeLoading')}
      </Text>
    );
  }

  if (briefing.narrative.status === 'UNAVAILABLE') {
    return (
      <Text className="mt-3 text-xs leading-5 text-text-3" testID="briefing-narrative-unavailable">
        {t('BriefingNarrativeUnavailable')}
      </Text>
    );
  }

  return null;
}

function EmptyNote({
  icon,
  title,
  body,
  tone = 'neutral',
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: 'neutral' | 'success';
  accent?: string;
}) {
  const success = tone === 'success';
  return (
    <View
      testID="briefing-yesterday-empty"
      className={`mt-3 flex-row items-start gap-3 rounded-control border p-4 ${
        success ? 'border-accent/20 bg-accent-soft' : 'border-border bg-surface-2'
      }`}
    >
      <View className="mt-0.5">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-sm font-semibold text-text"
          style={success && accent ? { color: accent } : undefined}
        >
          {title}
        </Text>
        <Text className="mt-1 text-xs leading-5 text-text-2">{body}</Text>
      </View>
    </View>
  );
}
