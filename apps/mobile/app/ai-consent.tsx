import { Linking, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react-native';
import { aiPrivacyUrl } from '@beyou/i18n';
import Button from '../src/ui/Button';
import IconTile from '../src/ui/IconTile';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import { useScreenTopPadding } from '../src/ui/useScreenTopPadding';
import { useAnswerAiConsent } from '../src/aiConsent/useAiConsent';

const WHAT_IS_SENT = [
  'AiConsentWhatMessages',
  'AiConsentWhatItems',
  'AiConsentWhatProfile',
  'AiConsentWhatBriefing',
] as const;

/**
 * Asks, once, whether Beyou may send the person's data to its AI provider, before any AI
 * feature runs (App Store guideline 5.1.2(i): say who receives what, and get explicit
 * permission first).
 *
 * The root Gate sends every signed-in account whose answer is UNASKED here, before the
 * dashboard mounts, because the daily briefing reaches the provider from the dashboard
 * without the person opening anything. Configuration and the assistant send people back
 * here to change their answer, so the full disclosure is what they read before saying yes.
 *
 * Outside the (app) group on purpose: no bottom bar, no assistant button, nothing behind it.
 */
export default function AiConsentScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const paddingTop = useScreenTopPadding();
  const { answer, saving } = useAnswerAiConsent();

  const respond = async (granted: boolean) => {
    const saved = await answer(granted);
    if (!saved) {
      notify.error(t('AiConsentSaveFailed'));
      return;
    }
    // Asked by the Gate it was a replace, so there is nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop, paddingBottom: 40, paddingHorizontal: 20, gap: 18 }}
      testID="ai-consent-screen"
    >
      <IconTile tone="accent" size={48}>
        <Sparkles size={22} color={theme.accent} />
      </IconTile>
      <Text className="text-2xl font-bold text-text" accessibilityRole="header">
        {t('AiConsentTitle')}
      </Text>
      <Text className="text-[15px] leading-relaxed text-text-2">{t('AiConsentIntro')}</Text>

      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-text">{t('AiConsentWhoTitle')}</Text>
        <Text className="text-[14px] leading-relaxed text-text-2" testID="ai-consent-who">
          {t('AiConsentWho')}
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-text">{t('AiConsentWhatTitle')}</Text>
        {WHAT_IS_SENT.map((key) => (
          <View key={key} className="flex-row gap-2">
            <Text className="text-[14px] text-text-3">{'•'}</Text>
            <Text className="flex-1 text-[14px] leading-relaxed text-text-2">{t(key)}</Text>
          </View>
        ))}
        <Text className="mt-1 text-[14px] font-semibold leading-relaxed text-text-2">
          {t('AiConsentNeverSent')}
        </Text>
      </View>

      <Text className="text-[13px] leading-relaxed text-text-3">{t('AiConsentTerms')}</Text>
      <Text
        className="text-[13px] font-semibold text-accent"
        accessibilityRole="link"
        onPress={() => Linking.openURL(aiPrivacyUrl(i18n.language))}
        testID="ai-consent-policy"
      >
        {t('AiConsentPolicyLink')}
      </Text>

      <View className="mt-2 gap-3">
        <Button
          text={t('AiConsentAllow')}
          mode="primary"
          size="block"
          disabled={saving}
          onPress={() => respond(true)}
          testID="ai-consent-allow"
        />
        <Button
          text={t('AiConsentDecline')}
          mode="default"
          size="block"
          disabled={saving}
          onPress={() => respond(false)}
          testID="ai-consent-decline"
        />
        <Text className="text-center text-[12px] leading-snug text-text-3">{t('AiConsentDeclineNote')}</Text>
      </View>
    </ScrollView>
  );
}
