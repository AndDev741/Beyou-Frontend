import { useMemo, useState } from 'react';
import { View, Text, PixelRatio } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react-native';
import {
  checkDayLabelKey,
  checkDayTone,
  countDone,
  heatmapRange,
  weekAlignedCells,
} from '@beyou/state';
import type { CheckDay } from '@beyou/types/checkday/checkHistory';
import WidgetCard from './WidgetCard';
import { CheckLegend, TONE_CLASS } from '../CheckStrip';
import useCheckHistory from '../useCheckHistory';
import useTodayInZone from '../useTodayInZone';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/** Four months. Long enough to see a habit form, short enough to stay legible on a phone. */
const WEEKS_SHOWN = 16;
const ROWS = 7;
const GAP = 3;

const floorToPixel = (value: number) => {
  const ratio = PixelRatio.get();
  return Math.floor(value * ratio) / ratio;
};

/**
 * Sixteen weeks of the account's days, one column per week and one row per weekday.
 *
 * NOTE ON THE DESIGN: the mockup captioned this "intensity = % of the routine
 * completed that day". That series does not exist — nothing stores completion per
 * day, only how the day ENDED — so a square encodes the outcome and the caption says
 * so rather than implying a percentage nobody computed.
 *
 * Laid out by hand as 7 rows of measured squares: there is no CSS grid here, and the
 * web's column flow has to become an explicit transpose of the week-aligned cells.
 */
export default function ConstanceHeatmapWidget() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  // Anchored on a day that turns at midnight: memoized on the timezone alone, the
  // window froze and a refetch kept asking for the stale range.
  const anchor = useTodayInZone();
  const { from, to } = useMemo(() => heatmapRange(WEEKS_SHOWN, anchor), [anchor]);
  const { days, loading, error, today } = useCheckHistory({ ownerType: 'USER', from, to });
  const [gridWidth, setGridWidth] = useState(0);

  // Column-major cells (week × weekday) turned into rows the way RN can render them.
  const rows = useMemo(() => {
    // No days and nothing in flight means no grid. Falling through would collapse the
    // column count to one, and a square's side comes from the measured width divided
    // by that — so an empty history painted seven blocks each as tall as the widget
    // is wide. The web sibling renders nothing here, which is the right answer.
    if (!loading && days.length === 0) return [];

    const cells = loading ? Array.from({ length: WEEKS_SHOWN * ROWS }, () => null) : weekAlignedCells(days);
    const columns = Math.max(1, Math.ceil(cells.length / ROWS));
    return Array.from({ length: ROWS }, (_, row) =>
      Array.from({ length: columns }, (_, column) => cells[column * ROWS + row] ?? null),
    ) as (CheckDay | null)[][];
  }, [days, loading]);

  const columns = rows[0]?.length ?? WEEKS_SHOWN;
  const cell = gridWidth > 0 ? floorToPixel((gridWidth - GAP * (columns - 1)) / columns) : 0;

  return (
    <WidgetCard
      title={t('ConstanceHeatmap')}
      icon={<CalendarDays size={14.5} color={theme.text3} />}
      testID="widget-constance-heatmap"
    >
      <View
        className="mt-3"
        style={{ gap: GAP }}
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={t('CheckStripLabel', { done: countDone(days), total: days.length })}
        testID="constance-heatmap"
      >
        {cell > 0 &&
          rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row" style={{ gap: GAP }}>
              {row.map((day, columnIndex) => (
                <View
                  key={day ? day.day : `pad-${rowIndex}-${columnIndex}`}
                  className={
                    day
                      ? `rounded-[3px] ${TONE_CLASS[checkDayTone(day, today)]}`
                      : 'rounded-[3px] opacity-40 bg-surface-2'
                  }
                  style={{ width: cell, height: cell }}
                  accessibilityLabel={day ? `${day.day} · ${t(checkDayLabelKey(day, today))}` : undefined}
                />
              ))}
            </View>
          ))}
      </View>

      <Text className="mt-2.5 text-[10.5px] text-text-3">
        {error ? t('CheckHistoryUnavailable') : t('HeatmapCaption', { weeks: WEEKS_SHOWN })}
      </Text>
      {!error ? (
        <View className="mt-1.5">
          <CheckLegend />
        </View>
      ) : null}
    </WidgetCard>
  );
}
