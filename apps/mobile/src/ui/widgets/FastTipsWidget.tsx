import { Text, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import WidgetCard from './WidgetCard';
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

  return (
    <WidgetCard title={t('Fast Tips')} bigSize testID="widget-fast-tips">
      <Text className="text-primary text-center font-medium" testID="fast-tip">
        {t(tip.smallPhrase)}
      </Text>
      {url && tip.phraseURL ? (
        <Pressable
          onPress={() => Linking.openURL(url)}
          accessibilityRole="link"
          testID="fast-tip-link"
          className="mt-1"
        >
          <Text className="text-secondary text-center font-bold underline">{t(tip.phraseURL)}</Text>
        </Pressable>
      ) : null}
    </WidgetCard>
  );
}
