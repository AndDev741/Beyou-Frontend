import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

export type XpSparklineTone = 'good' | 'warm' | 'accent';
export type XpSparklineSize = 'sm' | 'md';

const TONE_CLASS: Record<XpSparklineTone, { bar: string; last: string }> = {
  // The web's decision, kept in one place: the best area's series is green, the worst
  // one's is flame (attention, not error) and everything else is the accent. 80%
  // against 100% so today reads as the brightest bar of one colour, not as a
  // different colour from the rest of the week.
  good: { bar: 'bg-success/80', last: 'bg-success' },
  warm: { bar: 'bg-flame/80', last: 'bg-flame' },
  accent: { bar: 'bg-accent/80', last: 'bg-accent' },
};

const SIZE_CLASS: Record<XpSparklineSize, { plot: string; label: string }> = {
  sm: { plot: 'h-9', label: 'text-[9px]' },
  md: { plot: 'h-14', label: 'text-[10px]' },
};

export type XpSparklineProps = {
  /** One value per day, oldest first. The last is today. */
  values: number[];
  /** ISO days matching `values` index for index, for the tapped-bar label. */
  days?: string[];
  /** Day labels for the ends of the axis. Only the first and last are drawn. */
  labels?: [string, string];
  tone?: XpSparklineTone;
  size?: XpSparklineSize;
  /** Read out to assistive tech in place of the bars. */
  summary?: string;
  testID?: string;
};

/**
 * `2026-08-15` as the day it is locally. Built from the parts rather than handed to
 * `new Date(iso)`, which reads a bare date as UTC midnight: west of Greenwich that is
 * the day before, and every bar would be labelled with yesterday.
 */
function formatDay(iso: string, locale: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
  });
}

/**
 * A week of XP as bars, with today the brightest. Port of the web's `XpSparkline`.
 *
 * Views, not `react-native-svg`, for the web's reason: an SVG with a fixed viewBox
 * scales the type along with the bars, so the axis labels would come out a different
 * size in a widget and on a category card. Percent heights inside a fixed-height row
 * give the same drawing at any width.
 *
 * Scaled to its own maximum: the bars answer "which day was the good one". A day with
 * nothing still gets a sliver, because zero is an answer and an empty slot reads as
 * missing data.
 *
 * The web shows one day's number in a tooltip that floats above the bar on hover or
 * tap. A phone has no hover, and a floating label above the plot gets clipped by
 * whichever card wraps the chart, so here a tap writes the number into a readout
 * line above the bars instead. Same information, no overflow.
 */
export default function XpSparkline({
  values,
  days,
  labels,
  tone = 'accent',
  size = 'md',
  summary,
  testID = 'xp-sparkline',
}: XpSparklineProps) {
  const { t, i18n } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);

  if (values.length === 0) return null;

  const classes = TONE_CLASS[tone];
  const sizes = SIZE_CLASS[size];
  // Negative days (XP given back) do not draw below the floor.
  const peak = Math.max(...values.map((value) => Math.max(value, 0)), 0);

  const labelFor = (index: number) => {
    const dayLabel = days?.[index] ? formatDay(days[index], i18n.language) : null;
    return `${dayLabel ? `${dayLabel} · ` : ''}${Math.round(values[index])} XP`;
  };

  return (
    <View
      className="mt-3"
      accessibilityRole="image"
      accessibilityLabel={summary ?? t('XpLastDays', { count: values.length })}
      testID={testID}
    >
      {/* The readout line keeps its height whether or not a bar is pinned, so a tap
          does not push the card's content down. */}
      <Text
        className={`mb-0.5 h-4 text-right font-mono leading-4 text-text ${sizes.label}`}
        numberOfLines={1}
        testID={`${testID}-readout`}
      >
        {pinned !== null ? labelFor(pinned) : ''}
      </Text>

      <View className={`relative flex-row items-end gap-[3px] ${sizes.plot}`}>
        {/* The mockup's three grid lines, behind the bars. */}
        {[0, 50, 100].map((offset) => (
          <View
            key={offset}
            pointerEvents="none"
            className="absolute left-0 right-0 h-px bg-border"
            style={{ top: `${offset}%` }}
          />
        ))}

        {values.map((value, index) => {
          const height = peak > 0 ? Math.max(6, (Math.max(value, 0) / peak) * 100) : 6;
          const isToday = index === values.length - 1;
          const isPinned = pinned === index;
          return (
            <Pressable
              key={index}
              testID="xp-bar"
              accessibilityRole="button"
              accessibilityLabel={labelFor(index)}
              accessibilityState={{ selected: isPinned }}
              onPress={() => setPinned(isPinned ? null : index)}
              className={`flex-1 rounded-[2px] ${isToday ? classes.last : classes.bar}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </View>

      {labels ? (
        <View className="mt-1 flex-row justify-between">
          <Text className={`font-mono text-text-3 ${sizes.label}`}>{labels[0]}</Text>
          <Text className={`font-mono text-text-3 ${sizes.label}`}>{labels[1]}</Text>
        </View>
      ) : null}
    </View>
  );
}
