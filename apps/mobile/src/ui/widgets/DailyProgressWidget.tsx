import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { Target } from 'lucide-react-native';
import { getRoutineStats } from '@beyou/state';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

export interface DailyProgressWidgetProps {
  checked: number;
  total: number;
}

const SIZE = 108;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * O widget "Hoje": anel grande com a porcentagem do dia e, ao lado, o que ela
 * significa em números — itens concluídos e XP ganho hoje.
 *
 * XP DO DIA, não o acumulado da conta: sai dos checks de hoje da rotina, igual
 * à web. `perfil.xp` mostraria o total de vida no lugar do ganho de hoje.
 */
export default function DailyProgressWidget({ checked, total }: DailyProgressWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const today = new Date().toISOString().split('T')[0];
  const xpToday = routine ? getRoutineStats(routine, today).xpEarned : 0;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <WidgetCard
      title={t('Today')}
      icon={<Target size={14.5} color={theme.text3} />}
      testID="widget-daily-progress"
    >
      <View className="mt-3 flex-row items-center gap-[18px]">
        <View style={{ width: SIZE, height: SIZE }} testID="daily-progress-ring">
          <Svg width={SIZE} height={SIZE} viewBox="0 0 72 72">
            <Circle cx={36} cy={36} r={RADIUS} fill="none" strokeWidth={7} stroke={theme.surface2} />
            <Circle
              cx={36}
              cy={36}
              r={RADIUS}
              fill="none"
              strokeWidth={7}
              strokeLinecap="round"
              stroke={theme.accent}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
              transform="rotate(-90 36 36)"
            />
          </Svg>
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            className="items-center justify-center"
          >
            <Text className="font-mono text-[22px] font-semibold tracking-[-0.03em] text-text">
              {`${percent}%`}
            </Text>
            <Text className="text-[10.5px] text-text-3">{t('OfTheDay')}</Text>
          </View>
        </View>

        <View className="min-w-0 flex-1 gap-[7px]">
          <Text className="text-[12.5px] text-text-2">
            <Text className="font-semibold text-text">{`${checked} ${t('Of')} ${total}`}</Text>
            {` ${t('Completed')}`}
          </Text>
          <Text className="text-[12.5px] text-text-2">
            <Text className="font-mono font-semibold text-xp">{`+${xpToday} XP`}</Text>
            {` ${t('EarnedToday')}`}
          </Text>
        </View>
      </View>
    </WidgetCard>
  );
}
