import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';

/**
 * Login route placeholder. The branded form lands in P2-T7.
 * Keeps the email input + submit button testIDs from the Phase 1 LoginScreen so
 * the root-layout redirect test has concrete targets to assert against.
 */
export default function LoginRoute() {
  const { t } = useTranslation();

  return (
    <View
      testID="login-screen"
      style={{ flex: 1, justifyContent: 'center', padding: 24 }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 32, color: defaultLight.primary }}>
        {t('Login')}
      </Text>
      <TextInput
        testID="login-email-input"
        placeholder={t('EmailPlaceholder')}
        accessibilityLabel={t('EmailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderColor: defaultLight.placeholder }}
      />
      <Pressable testID="login-submit-button" accessibilityRole="button">
        <Text style={{ textAlign: 'center', color: defaultLight.primary }}>{t('Enter')}</Text>
      </Pressable>
    </View>
  );
}
