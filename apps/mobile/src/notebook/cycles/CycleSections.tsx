import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { daysBetweenIso, formatStudyMinutes, lapShare, orderedDays, weekMinutes } from '@beyou/state';
import type { CycleDay, LapSummary, Weekday } from '@beyou/types/notebook/studyCycle';
import Card from '../../ui/Card';
import ProgressBar from '../ProgressBar';
import type { RootState } from '../../store';
import { formatIsoDay, isoDayOf, weekdayLabel } from './cycleText';

/** "6 of 15 blocks closed" with the bar, and what the lap has given so far. */
export function LapCard({ lap, children }: { lap: LapSummary; children?: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const started = formatIsoDay(isoDayOf(lap.startedAt, timezone), i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <Card className="gap-3" testID="cycle-lap">
      <View className="gap-1">
        <Text className="text-[11.5px] font-semibold uppercase tracking-[1px] text-text-3">
          {t('StudyCycleMobileLapStarted', { number: lap.number, date: started })}
        </Text>
        <Text accessibilityRole="header" className="text-[18px] font-semibold text-text" testID="cycle-lap-title">
          {t('StudyCycleMobileBlocksClosed', { closed: lap.blocksClosed, count: lap.blocks })}
        </Text>
      </View>
      <ProgressBar share={lapShare(lap)} />
      <View className="gap-0.5">
        {lap.understood > 0 ? (
          <Text className="text-[13px] font-semibold text-success">
            {t('StudyCycleMobileConceptsUnderstood', { count: lap.understood })}
          </Text>
        ) : null}
        {lap.turnsUsed > 0 ? (
          <Text className="text-[13px] text-text-2">{t('StudyCycleMobileConceptsCarried', { count: lap.turnsUsed })}</Text>
        ) : null}
        <Text className="text-[13px] text-text-2">
          {t('StudyCycleMobileLapStudied', {
            studied: formatStudyMinutes(lap.minutes),
            planned: formatStudyMinutes(lap.plannedMinutes),
          })}
        </Text>
      </View>
      {children}
    </Card>
  );
}

/** The cycle's week: minutes and start time per day, today marked, a rest day said as one. */
export function WeekCard({ days, today }: { days: CycleDay[]; today: Weekday | null }) {
  const { t, i18n } = useTranslation();
  const ordered = orderedDays(days);
  const most = Math.max(1, ...ordered.map((day) => day.minutes));
  return (
    <Card className="gap-2" testID="cycle-week">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileWeek')}</Text>
        <Text className="font-mono-semibold text-[12px] text-text-2">{formatStudyMinutes(weekMinutes(days))}</Text>
      </View>
      {ordered.map((day) => {
        const isToday = day.weekday === today;
        return (
          <View
            key={day.weekday}
            className={`flex-row items-center gap-2.5 rounded-lg px-2 py-1.5 ${isToday ? 'bg-accent/5' : ''}`}
            testID={`cycle-week-${day.weekday}`}
          >
            <Text className={`w-10 text-[13px] font-semibold ${isToday ? 'text-accent' : 'text-text'}`}>
              {weekdayLabel(day.weekday, i18n.language)}
            </Text>
            <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <View
                className={`h-full rounded-full ${isToday ? 'bg-accent' : 'bg-text-3'}`}
                style={{ width: `${Math.round((day.minutes / most) * 100)}%` }}
              />
            </View>
            <Text className="w-[92px] text-right text-[12px] text-text-2">
              {day.minutes > 0
                ? [formatStudyMinutes(day.minutes), day.startTime].filter(Boolean).join(' · ')
                : t('StudyCycleMobileRest')}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

/** The last laps, newest first: their dates, the time they took and the concepts they closed. */
export function PreviousLaps({ laps }: { laps: LapSummary[] }) {
  const { t, i18n } = useTranslation();
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  if (laps.length === 0) return null;
  const short = (iso: string) => formatIsoDay(iso, i18n.language, { day: 'numeric', month: 'short' });
  return (
    <Card className="gap-2" testID="cycle-previous-laps">
      <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobilePreviousLaps')}</Text>
      {laps.map((lap) => {
        const from = isoDayOf(lap.startedAt, timezone);
        const to = lap.closedAt ? isoDayOf(lap.closedAt, timezone) : from;
        const days = Math.max(1, daysBetweenIso(from, to) + 1);
        return (
          <View key={lap.number} className="flex-row items-center justify-between gap-3 border-t border-border pt-2">
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-text">{t('StudyCycleMobileLap', { number: lap.number })}</Text>
              <Text className="text-[12px] text-text-2">
                {t('StudyCycleMobileLapDates', { from: short(from), to: short(to), count: days })}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-mono-semibold text-[13px] text-text">{formatStudyMinutes(lap.minutes)}</Text>
              <Text className="text-[12px] text-text-2">{t('StudyCycleMobileConceptsUnderstood', { count: lap.understood })}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
