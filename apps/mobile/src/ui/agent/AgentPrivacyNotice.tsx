import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react-native';
import { aiPrivacyUrl } from '@beyou/i18n';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * Says where the conversation goes, before it goes anywhere.
 *
 * The assistant is the one feature that hands what a person wrote to a company that
 * is not Beyou, along with the habits and goals it read to answer them. The privacy
 * policy has said so for a while; the app said nothing, and no string in
 * `packages/i18n` so much as mentioned an external provider. Disclosure nobody can
 * reach from inside the app is not disclosure.
 *
 * On the empty state rather than above the composer: it belongs to the decision to
 * start talking, and over every message it would become furniture.
 */
export default function AgentPrivacyNotice() {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  return (
    <View className="mt-2 max-w-[320px] flex-row items-start gap-2" testID="agent-privacy-notice">
      <View className="mt-0.5">
        <Info size={13} color={theme.text3} />
      </View>
      <Text className="flex-1 text-[12px] leading-snug text-text-3">
        {t('AgentPrivacyNotice')}{' '}
        <Text
          className="font-semibold text-accent"
          accessibilityRole="link"
          onPress={() => Linking.openURL(aiPrivacyUrl(i18n.language))}
        >
          {t('AgentPrivacyLink')}
        </Text>
      </Text>
    </View>
  );
}
