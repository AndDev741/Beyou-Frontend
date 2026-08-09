import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import fastTipsData from './fastTips.json';

type Tip = {
  phrase: string;
  smallPhrase: string;
  urlEN?: string;
  urlPT?: string;
  phraseURL?: string;
};

const MS_PER_DAY = 86_400_000;

/** UTC day-of-year (0-based) — same as the web widget, so both platforms pick
 *  the same tip on a given calendar day. */
function getDayOfYear(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfYear = Date.UTC(date.getFullYear(), 0, 1);
  return Math.floor((utc - startOfYear) / MS_PER_DAY);
}

/** Daily-rotating habit tip — mirrors the web FastTips widget. */
export default function FastTipsWidget() {
  const { t, i18n } = useTranslation();
  const tips = fastTipsData.tips as Tip[];
  const tip = tips[getDayOfYear(new Date()) % tips.length];
  const url = i18n.language === 'pt' ? tip.urlPT : tip.urlEN;
  const index = getDayOfYear(new Date()) % tips.length;
  const { theme } = useBeyouTheme();

  return (
    <WidgetCard
      title={t('Fast Tips')}
      icon={<Lightbulb size={14.5} color={theme.text3} />}
      testID="widget-fast-tips"
    >
      <View className="mt-3 flex-row items-start gap-2.5">
        <View
          className="h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: withAlpha(theme.xp, 0.13) }}
        >
          <Lightbulb size={15} color={theme.xp} />
        </View>
        <Text className="min-w-0 flex-1 text-[12.5px] leading-snug text-text-2" testID="fast-tip">
          {t(tip.phrase)}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-mono text-[10.5px] text-text-3">
          {t('TipCounter', { index: index + 1, total: tips.length })}
        </Text>
        {url && tip.phraseURL ? (
          <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" testID="fast-tip-link">
            <Text className="font-mono text-[10.5px] font-semibold text-accent">
              {t(tip.phraseURL)}
            </Text>
          </Pressable>
        ) : (
          <Text className="font-mono text-[10.5px] text-text-3">{t('ChangesDaily')}</Text>
        )}
      </View>
    </WidgetCard>
  );
}
