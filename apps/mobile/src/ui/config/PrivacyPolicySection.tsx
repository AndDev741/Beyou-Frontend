import { View, Text, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ShieldCheck } from 'lucide-react-native';
import { privacyPolicyUrl } from '@beyou/i18n';
import IconTile from '../IconTile';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * The way to the privacy policy from inside the app, on a phone.
 *
 * Google Play links to it from the store listing, which reaches somebody deciding
 * whether to install and nobody who already did. This is the other half: the same
 * document, one tap from the screen where a person is already looking at what the
 * app knows about them.
 */
export default function PrivacyPolicySection() {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  return (
    <Pressable
      onPress={() => Linking.openURL(privacyPolicyUrl(i18n.language))}
      accessibilityRole="link"
      accessibilityLabel={t('PrivacyPolicy')}
      testID="privacy-policy-link"
      className="w-full flex-row items-center gap-3 rounded-control border border-border p-3 active:bg-surface-2"
    >
      <IconTile tone="accent" size={36}>
        <ShieldCheck size={16} color={theme.accent} />
      </IconTile>
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-semibold text-text">{t('PrivacyPolicy')}</Text>
        <Text className="text-[12px] leading-snug text-text-3">{t('PrivacyPolicyHint')}</Text>
      </View>
      <ExternalLink size={14} color={theme.text3} />
    </Pressable>
  );
}
