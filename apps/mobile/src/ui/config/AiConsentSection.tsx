import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Button from '../Button';
import { notify } from '../../notify';
import { useAiConsent, useAnswerAiConsent } from '../../aiConsent/useAiConsent';

/**
 * Where the answer to the AI question is changed after the first time.
 *
 * Turning the features off takes one tap and holds at once (the server refuses the AI routes
 * from then on). Turning them on goes through the consent screen, so the yes is always given
 * with the list of who receives what in front of the person, never from a bare switch.
 */
export default function AiConsentSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const consent = useAiConsent();
  const { answer, saving } = useAnswerAiConsent();

  // An older backend that does not know the field: there is nothing to change.
  if (!consent) return null;
  const on = consent === 'GRANTED';

  const turnOff = async () => {
    if (await answer(false)) notify.success(t('AiConfigTurnedOff'));
    else notify.error(t('AiConsentSaveFailed'));
  };

  return (
    <View className="gap-2" testID="ai-consent-section">
      <Text className="text-text-2 text-sm font-semibold">{t('AiConfigTitle')}</Text>
      <Text className="text-text-3 text-xs" testID="ai-consent-state">
        {t(on ? 'AiConfigOn' : 'AiConfigOff')}
      </Text>
      <Button
        text={t(on ? 'AiConfigTurnOff' : 'AiConfigTurnOn')}
        mode={on ? 'default' : 'tonal'}
        size="block"
        submitting={saving}
        onPress={on ? turnOff : () => router.push('/ai-consent')}
        testID={on ? 'ai-consent-turn-off' : 'ai-consent-turn-on'}
        className="mt-1"
      />
    </View>
  );
}
