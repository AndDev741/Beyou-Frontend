import { useState } from 'react';
import { View, Text, PixelRatio } from 'react-native';
import { useTranslation } from 'react-i18next';
import { checkDayLabelKey, checkDayTone, countDone, type CheckTone } from '@beyou/state';
import type { CheckDay } from '@beyou/types/checkday/checkHistory';

const GAP = 3;

/**
 * Rounds the side DOWN to the physical pixel: with a fractional value RN rounds each
 * square up, the row overflows the width and the last one drops to the line below.
 */
const floorToPixel = (value: number) => {
  const ratio = PixelRatio.get();
  return Math.floor(value * ratio) / ratio;
};

/** Same four tones as the web, same reasoning — three greys nobody can decode become one. */
const TONE_CLASS: Record<CheckTone, string> = {
  done: 'bg-accent',
  skipped: 'bg-accent/45',
  missed: 'bg-danger/35',
  idle: 'bg-surface-2',
  open: 'bg-surface-2 border border-accent/70',
};

interface CheckStripProps {
  days: CheckDay[];
  /** Today in the USER's timezone, so the open square is the right one. */
  today?: string;
  /** Squares per row. 14 for a two-week or four-week strip. */
  columns?: number;
  testID?: string;
}

/**
 * One square per day, wrapped into rows of `columns`.
 *
 * A grid built by hand: `grid-cols-14` does not exist in RN, and a percentage width
 * with `aspect-square` gives squares no height at all — the side has to come from
 * the MEASURED width.
 *
 * The whole strip is one image with a summary label rather than 28 announced views:
 * a screen reader walking "square, square, square" says nothing, and the count of
 * done days is the message.
 */
export default function CheckStrip({ days, today, columns = 14, testID }: CheckStripProps) {
  const { t } = useTranslation();
  const [stripWidth, setStripWidth] = useState(0);
  const cell = stripWidth > 0 ? floorToPixel((stripWidth - GAP * (columns - 1)) / columns) : 0;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      onLayout={(event) => setStripWidth(event.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={t('CheckStripLabel', { done: countDone(days), total: days.length })}
      testID={testID}
    >
      {cell > 0 &&
        days.map((day) => (
          <View
            key={day.day}
            className={`rounded-[3px] ${TONE_CLASS[checkDayTone(day, today)]}`}
            style={{ width: cell, height: cell }}
            // No hover on a phone: the label rides on the square itself, so a
            // screen reader can walk the strip when the summary is not enough.
            accessibilityLabel={`${day.day} · ${t(checkDayLabelKey(day, today))}`}
            testID={`check-cell-${day.day}`}
          />
        ))}
    </View>
  );
}

/** The strip's shape while the history is in flight, so the card does not jump. */
export function CheckStripSkeleton({
  length = 14,
  columns = 14,
}: {
  length?: number;
  columns?: number;
}) {
  const [stripWidth, setStripWidth] = useState(0);
  const cell = stripWidth > 0 ? floorToPixel((stripWidth - GAP * (columns - 1)) / columns) : 0;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      onLayout={(event) => setStripWidth(event.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {cell > 0 &&
        Array.from({ length }, (_, index) => (
          <View
            key={index}
            className="rounded-[3px] bg-surface-2 opacity-60"
            style={{ width: cell, height: cell }}
          />
        ))}
    </View>
  );
}

/** What the four tones mean — for the heatmap, which has the width to say it. */
export function CheckLegend() {
  const { t } = useTranslation();
  const entries: Array<{ tone: CheckTone; labelKey: string }> = [
    { tone: 'done', labelKey: 'OutcomeDone' },
    { tone: 'skipped', labelKey: 'OutcomeSkipped' },
    { tone: 'missed', labelKey: 'OutcomeMissed' },
    { tone: 'idle', labelKey: 'OutcomeNoActivity' },
  ];

  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
      {entries.map(({ tone, labelKey }) => (
        <View key={tone} className="flex-row items-center gap-1">
          <View className={`h-2.5 w-2.5 rounded-[3px] ${TONE_CLASS[tone]}`} />
          <Text className="text-[10.5px] text-text-3">{t(labelKey)}</Text>
        </View>
      ))}
    </View>
  );
}
