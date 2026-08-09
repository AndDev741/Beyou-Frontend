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
 * Constância: o número grande, o recorde ao lado e a faixa dos últimos 28 dias.
 *
 * A API não devolve histórico diário — o que sabemos com certeza é o tamanho da
 * sequência ATUAL. A faixa então destaca só esses dias e deixa o resto neutro; o
 * rótulo diz isso em voz alta para ninguém ler quadrado apagado como "falhei".
 * Quando existir endpoint de histórico, é aqui que ele entra.
 */
export default function ConstanceWidget({ constance }: ConstanceWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const best = useSelector((s: RootState) => s.perfil.maxConstance);
  const streakDays = Math.min(constance, DAYS_SHOWN);
  const [stripWidth, setStripWidth] = useState(0);
  // Arredonda o lado PARA BAIXO no pixel físico: com valor fracionário o RN
  // arredonda cada quadrado para cima e a linha estourava a largura, jogando
  // o 14º para a linha de baixo.
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

      {/* Grade de 14 colunas montada à mão: `grid-cols-14` não existe no RN.
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
            // A sequência atual termina hoje, então ela ocupa o FIM da faixa.
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
