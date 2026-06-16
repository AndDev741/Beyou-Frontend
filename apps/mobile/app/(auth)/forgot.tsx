import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';

/**
 * Forgot-password route stub. Filled in a later increment.
 */
export default function ForgotRoute() {
  const { t } = useTranslation();

  return (
    <View testID="forgot-screen" style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ textAlign: 'center', color: defaultLight.primary }}>
        {t('ForgotPassword')}
      </Text>
    </View>
  );
}
