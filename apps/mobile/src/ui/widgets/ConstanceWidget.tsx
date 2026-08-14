import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Flame } from 'lucide-react-native';
import WidgetCard from './WidgetCard';
import CheckStrip, { CheckStripSkeleton } from '../CheckStrip';
import useCheckHistory from '../useCheckHistory';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

export interface ConstanceWidgetProps {
  constance: number;
}

/** 14 columns × 2 rows. Also the endpoint's own default range, so the call names no dates. */
const DAYS_SHOWN = 28;

/**
 * Streak: the big number, the record beside it, and the last 28 days as they really
 * went — `GET /check-history` for the account.
 *
 * The strip used to be derived from the number itself, highlighting the last N
 * squares because that was all the API knew. Asking for no range is deliberate: the
 * endpoint's default is exactly these 28 days, ending on the user's today in the
 * USER's timezone, which on a travelling phone is not the device's.
 */
export default function ConstanceWidget({ constance }: ConstanceWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const best = useSelector((s: RootState) => s.perfil.maxConstance);
  const dormant = useSelector((s: RootState) => s.perfil.constanceDormant);
  const countedToday = useSelector((s: RootState) => s.perfil.alreadyIncreaseConstanceToday);
  const { days, loading, error, today } = useCheckHistory({ ownerType: 'USER' });

  /**
   * Today's square, lit from the profile rather than from a row.
   *
   * A check writes the day of the HABIT it belongs to; the account's own day is
   * closed by a scheduler hours after midnight, so the account's history has no row
   * for today and the square would stay open until tomorrow — right after the user
   * did the thing, next to a number that already moved.
   *
   * `alreadyIncreaseConstanceToday` is not a guess at that row: it is the same fact
   * from the field the check response updates.
   */
  const shownDays = useMemo(() => {
    if (!countedToday) return days;
    return days.map((day) =>
      day.day === today && day.outcome === 'UNKNOWN' ? { ...day, outcome: 'DONE' as const } : day,
    );
  }, [days, today, countedToday]);

  return (
    <WidgetCard
      title={t('Constance')}
      icon={<Flame size={14.5} color={theme.text3} />}
      testID="widget-constance"
    >
      <View className="mt-2.5 flex-row items-baseline gap-2">
        {/* A dormant run keeps its number — it did not break, it stopped moving — so
            the number is dimmed and labelled instead of reset. */}
        <Text
          className={`font-mono-semibold text-2xl tracking-[-0.03em] ${dormant ? 'text-text-3' : 'text-text'}`}
          testID="constance-value"
        >
          {constance}
        </Text>
        <Text className="text-xs text-text-3">
          {`${t('DaysInARow', { count: constance })}${best > 0 ? ` · ${t('Best')}: ${best}` : ''}`}
        </Text>
      </View>

      {dormant && constance > 0 ? (
        <Text className="mt-1 text-[11px] text-text-3" testID="constance-dormant">
          {t('StreakPausedExplanation')}
        </Text>
      ) : null}

      <View className="mt-3">
        {loading ? (
          <CheckStripSkeleton length={DAYS_SHOWN} />
        ) : (
          <CheckStrip days={shownDays} today={today} testID="streak-strip" />
        )}
      </View>

      <Text className="mt-2 text-[10.5px] text-text-3">
        {error ? t('CheckHistoryUnavailable') : t('StreakStripCaption')}
      </Text>
    </WidgetCard>
  );
}
