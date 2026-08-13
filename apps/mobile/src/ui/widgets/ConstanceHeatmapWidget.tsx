import { useMemo, useState } from 'react';
import { View, Text, PixelRatio } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { CalendarDays } from 'lucide-react-native';
import {
  checkDayLabelKey,
  checkDayTone,
  countDone,
  heatmapRange,
  todayInZone,
  weekAlignedCells,
  type CheckTone,
} from '@beyou/state';
import type { CheckDay } from '@beyou/types/checkday/checkHistory';
import WidgetCard from './WidgetCard';
import { CheckLegend } from '../CheckStrip';
import useCheckHistory from '../useCheckHistory';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

/** Four months. Long enough to see a habit form, short enough to stay legible on a phone. */
const WEEKS_SHOWN = 16;
const ROWS = 7;
const GAP = 3;

const TONE_CLASS: Record<CheckTone, string> = {
  done: 'bg-accent',
  skipped: 'bg-accent/45',
  missed: 'bg-danger/35',
  idle: 'bg-surface-2',
  open: 'bg-surface-2 border border-accent/70',
};

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
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const { from, to } = useMemo(() => heatmapRange(WEEKS_SHOWN, todayInZone(timezone)), [timezone]);
  const { days, loading, error, today } = useCheckHistory({ ownerType: 'USER', from, to });
  const [gridWidth, setGridWidth] = useState(0);

  // Column-major cells (week × weekday) turned into rows the way RN can render them.
  const rows = useMemo(() => {
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
