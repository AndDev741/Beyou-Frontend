import { useState } from 'react';
import { View, Text, PixelRatio } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Flame } from 'lucide-react-native';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

export interface ConstanceWidgetProps {
  constance: number;
}

const DAYS_SHOWN = 28;
const COLUMNS = 14;
const GAP = 3;

const floorToPixel = (value: number) => {
  const ratio = PixelRatio.get();
  return Math.floor(value * ratio) / ratio;
};

/**
 * Streak: the big number, the record beside it and the strip of the last 28 days.
 *
 * The API returns no daily history — what we know for certain is the length of the
 * CURRENT streak. So the strip highlights only those days and leaves the rest
 * neutral; the label says so out loud, so nobody reads a dim square as "I failed".
 * When a history endpoint exists, this is where it plugs in.
 */
export default function ConstanceWidget({ constance }: ConstanceWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const best = useSelector((s: RootState) => s.perfil.maxConstance);
  const streakDays = Math.min(constance, DAYS_SHOWN);
  const [stripWidth, setStripWidth] = useState(0);
  // Rounds the side DOWN to the physical pixel: with a fractional value RN rounds
  // each square up, the row overflows the width and the 14th drops to the line
  // below.
  const cell = stripWidth > 0 ? floorToPixel((stripWidth - GAP * (COLUMNS - 1)) / COLUMNS) : 0;

  return (
    <WidgetCard
      title={t('Constance')}
      icon={<Flame size={14.5} color={theme.text3} />}
      testID="widget-constance"
    >
      <View className="mt-2.5 flex-row items-baseline gap-2">
        <Text className="font-mono-semibold text-2xl tracking-[-0.03em] text-text">{constance}</Text>
        <Text className="text-xs text-text-3">
          {`${t('DaysInARow')}${best > 0 ? ` · ${t('Best')}: ${best}` : ''}`}
        </Text>
      </View>

      {/* A 14-column grid built by hand: `grid-cols-14` does not exist in RN.
          O lado do quadrado vem da largura MEDIDA — com largura em porcentagem
          + `aspect-square` os quadrados saíam sem altura e a faixa ficava um
          vão vazio no cartão. */}
      <View
        className="mt-3 flex-row flex-wrap"
        style={{ gap: GAP }}
        onLayout={(event) => setStripWidth(event.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={t('StreakStripLabel', { days: streakDays, total: DAYS_SHOWN })}
        testID="streak-strip"
      >
        {cell > 0 &&
          Array.from({ length: DAYS_SHOWN }, (_, index) => {
            // The current streak ends today, so it occupies the END of the strip.
            const inStreak = index >= DAYS_SHOWN - streakDays;
            return (
              <View
                key={index}
                className={`rounded-[3px] ${inStreak ? 'bg-accent' : 'bg-surface-2'}`}
                style={{ width: cell, height: cell }}
              />
            );
          })}
      </View>
      <Text className="mt-2 text-[10.5px] text-text-3">{t('StreakStripCaption')}</Text>
    </WidgetCard>
  );
}
