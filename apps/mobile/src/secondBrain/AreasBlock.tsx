import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { secondBrainAreaEnds } from '@beyou/state';
import type { SecondBrainArea } from '@beyou/types/secondBrain/secondBrain';
import BeyouIcon from '../ui/BeyouIcon';
import Chip from '../ui/Chip';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';

type AreasBlockProps = {
  areas: SecondBrainArea[];
  /** False when the routines source is off. */
  enabled: boolean;
};

/**
 * Strong and weak, by category. A category is the person's own name for a part of their
 * life, so ranking them answers "where am I doing well" in their words.
 *
 * The server sends them sorted. Which rows get a label is a rule shared with the web app.
 */
export default function AreasBlock({ areas, enabled }: AreasBlockProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const ends = secondBrainAreaEnds(areas);

  return (
    <Block
      title={t('SecondBrainAreasTitle')}
      hint={enabled && areas.length > 0 ? t('SecondBrainAreasHint') : undefined}
      testID="second-brain-areas"
    >
      {!enabled ? (
        <Text className="text-sm text-text-2">{t('SecondBrainSourceOffBlock')}</Text>
      ) : areas.length === 0 ? (
        <Text className="text-sm leading-[21px] text-text-2">{t('SecondBrainAreasEmpty')}</Text>
      ) : (
        <View className="gap-4">
          {areas.map((area) => {
            const percent = area.percent;
            return (
              <View key={area.categoryId} testID="second-brain-area">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 flex-row items-center gap-2">
                    <BeyouIcon id={area.iconId} size={16} color={theme.text2} showFallback />
                    <Text className="shrink text-sm font-medium text-text" numberOfLines={1}>
                      {area.name}
                    </Text>
                    {ends?.strongestId === area.categoryId ? (
                      <Chip variant="ok" size="sm">
                        {t('SecondBrainAreaStrongest')}
                      </Chip>
                    ) : null}
                    {ends?.weakestId === area.categoryId ? (
                      <Chip variant="flame" size="sm">
                        {t('SecondBrainAreaWeakest')}
                      </Chip>
                    ) : null}
                  </View>
                  <Text className="shrink-0 font-mono text-xs text-text-2">
                    {percent != null ? `${percent}%` : t('SecondBrainAreaNoData')}
                  </Text>
                </View>
                {percent != null ? (
                  <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Block>
  );
}
