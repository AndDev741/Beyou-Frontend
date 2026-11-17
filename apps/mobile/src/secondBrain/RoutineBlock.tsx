import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';
import type { SecondBrainItemPattern, SecondBrainRoutine } from '@beyou/types/secondBrain/secondBrain';
import Ring from '../ui/Ring';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';

type RoutineBlockProps = {
  /** Null when the routines source is off. */
  routine: SecondBrainRoutine | null;
};

/** How many names each list shows. The week's point is the pattern, and five make one. */
const LIST_MAX = 5;

function PatternList({
  title,
  tone,
  items,
  empty,
  testID,
}: {
  title: string;
  tone: 'flame' | 'success';
  items: SecondBrainItemPattern[];
  empty: string;
  testID: string;
}) {
  const { t } = useTranslation();
  return (
    <View testID={testID}>
      <Text
        accessibilityRole="header"
        className={`text-[13px] font-semibold ${tone === 'flame' ? 'text-flame' : 'text-success'}`}
      >
        {title}
      </Text>
      {items.length === 0 ? (
        <Text className="mt-2 text-[13px] leading-[18px] text-text-2">{empty}</Text>
      ) : (
        <View className="mt-2 gap-2">
          {items.slice(0, LIST_MAX).map((item) => (
            <View key={item.name} className="flex-row items-baseline justify-between gap-3">
              <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                {item.name}
              </Text>
              <View className="shrink-0 items-end">
                <Text className="font-mono text-xs text-text-2">
                  {t('SecondBrainItemTimes', { checked: item.checked, asked: item.asked })}
                </Text>
                {/* Skipped again and again reads differently from forgotten, so the count of
                    skips is shown next to the item. */}
                {item.skipped > 0 && (
                  <Text className="font-mono text-[11px] text-flame" testID="second-brain-item-skipped">
                    {t('SecondBrainItemSkipped', { count: item.skipped })}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Whether the routines are being kept: the last seven days against the seven before, then
 * the items that slipped and the ones that held.
 *
 * The ring is the same piece as the check-in ring and the logo. The percentage leaves skipped
 * items out, since one skip is a choice. The two lists count them, because the same item
 * skipped again and again is a habit being dropped.
 */
export default function RoutineBlock({ routine }: RoutineBlockProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  if (!routine) {
    return (
      <Block title={t('SecondBrainRoutineTitle')} testID="second-brain-routine">
        <Text className="text-sm text-text-2">{t('SecondBrainSourceOffBlock')}</Text>
      </Block>
    );
  }

  const { thisWeekPercent, previousWeekPercent } = routine;
  const delta =
    thisWeekPercent != null && previousWeekPercent != null ? thisWeekPercent - previousWeekPercent : null;
  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaColor = delta == null || delta === 0 ? theme.text2 : delta > 0 ? theme.success : theme.flame;

  return (
    <Block title={t('SecondBrainRoutineTitle')} testID="second-brain-routine">
      {thisWeekPercent == null ? (
        <Text className="text-sm leading-[21px] text-text-2">{t('SecondBrainRoutineNoData')}</Text>
      ) : (
        <>
          <View className="flex-row items-center gap-4">
            <Ring
              size={76}
              state="progress"
              progress={thisWeekPercent / 100}
              label={`${thisWeekPercent}%`}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-text">{t('SecondBrainRoutineThisWeek')}</Text>
              {delta != null ? (
                <View className="mt-1 flex-row items-center gap-1" testID="second-brain-routine-delta">
                  <DeltaIcon size={15} color={deltaColor} />
                  <Text className="min-w-0 flex-1 text-[13px] leading-[18px]" style={{ color: deltaColor }}>
                    {delta > 0
                      ? t('SecondBrainRoutineUp', { points: delta })
                      : delta < 0
                        ? t('SecondBrainRoutineDown', { points: Math.abs(delta) })
                        : t('SecondBrainRoutineSame')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-5 gap-5">
            <PatternList
              title={t('SecondBrainSlipping')}
              tone="flame"
              items={routine.slipping}
              empty={t('SecondBrainNothingSlipping')}
              testID="second-brain-slipping"
            />
            <PatternList
              title={t('SecondBrainSteady')}
              tone="success"
              items={routine.steady}
              empty={t('SecondBrainNothingSteady')}
              testID="second-brain-steady"
            />
          </View>
        </>
      )}
    </Block>
  );
}
