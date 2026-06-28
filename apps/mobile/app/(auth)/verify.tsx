import { useEffect, useRef, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Button from '../../src/ui/Button';
import MobileBrand from '../../src/ui/MobileBrand';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { verifyEmailRequest, type VerifyEmailResult } from '../../src/auth/authApi';

type VerifyState = 'loading' | VerifyEmailResult;
const ICON_SIZE = 64;

export default function VerifyRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [state, setState] = useState<VerifyState>('loading');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    let active = true;
    (async () => {
      if (!token) {
        if (active) setState('error');
        return;
      }
      const result = await verifyEmailRequest(token);
      if (active) setState(result);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const goToLogin = () => router.replace('/(auth)/login');
  const goToRegister = () => router.replace('/(auth)/register');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View testID="verify-screen" className="flex-1 items-center justify-center px-8">
        {state === 'loading' ? (
          <View className="items-center gap-5" testID="verify-loading">
            <ActivityIndicator color={theme.primary} size="large" />
            <Text className="text-description text-center text-lg">{t('VerifyEmailLoading')}</Text>
          </View>
        ) : null}

        {state === 'success' ? (
          <View className="items-center gap-4" testID="verify-success">
            <Ionicons name="checkmark-circle" size={ICON_SIZE} color={theme.success} />
            <Text className="text-secondary text-center text-2xl font-bold">{t('VerifyEmailSuccessTitle')}</Text>
            <Text className="text-description text-center">{t('VerifyEmailSuccessMessage')}</Text>
            <Button text={t('Enter')} mode="create" size="big" onPress={goToLogin} testID="verify-login-button" />
          </View>
        ) : null}

        {state === 'expired' ? (
          <View className="items-center gap-4" testID="verify-expired">
            <Ionicons name="time-outline" size={ICON_SIZE} color={theme.error} />
            <Text className="text-secondary text-center text-2xl font-bold">{t('VerifyEmailExpiredTitle')}</Text>
            <Text className="text-description text-center">{t('VerifyEmailExpiredMessage')}</Text>
            <Button text={t('ToRegister')} mode="create" size="big" onPress={goToRegister} testID="verify-register-button" />
          </View>
        ) : null}

        {state === 'error' ? (
          <View className="items-center gap-4" testID="verify-error">
            <Ionicons name="close-circle" size={ICON_SIZE} color={theme.error} />
            <Text className="text-secondary text-center text-2xl font-bold">{t('VerifyEmailErrorTitle')}</Text>
            <Text className="text-description text-center">{t('VerifyEmailErrorMessage')}</Text>
            <Button text={t('Enter')} mode="create" size="big" onPress={goToLogin} testID="verify-login-button" />
          </View>
        ) : null}
      </View>
      <MobileBrand />
    </SafeAreaView>
  );
}
