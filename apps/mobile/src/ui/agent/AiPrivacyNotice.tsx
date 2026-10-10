import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react-native';
import { aiPrivacyUrl } from '@beyou/i18n';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * One line saying that what happens next goes to an external AI provider, with a link to
 * the part of the policy that names them. The mobile twin of the web `AiPrivacyNotice`.
 *
 * Every feature that hands text to a provider shows one, worded for what that feature
 * sends. Placed where the person decides to use the feature, never on every answer.
 */
export default function AiPrivacyNotice({
  messageKey,
  testID,
  className = '',
}: {
  messageKey: string;
  testID: string;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  return (
    <View className={`flex-row items-start gap-2 ${className}`} testID={testID}>
      <View className="mt-0.5">
        <Info size={13} color={theme.text3} />
      </View>
      <Text className="flex-1 text-[12px] leading-snug text-text-3">
        {t(messageKey)}{' '}
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
