import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';

/**
 * Register route placeholder. The branded form lands in P2-T8.
 */
export default function RegisterRoute() {
  const { t } = useTranslation();

  return (
    <View testID="register-screen" style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', color: defaultLight.primary }}>
        {t('Register')}
      </Text>
    </View>
  );
}
