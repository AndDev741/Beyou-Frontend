import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleX, Clock } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Button from '../../src/ui/Button';
import AuthShell from '../../src/ui/auth/AuthShell';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { verifyEmailRequest, type VerifyEmailResult } from '../../src/auth/authApi';

type VerifyState = 'loading' | VerifyEmailResult;

/** Bloco de resultado: disco com o ícone do tom, título, mensagem e a ação. */
function Result({
  icon,
  tint,
  title,
  message,
  action,
  testID,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  message: string;
  action: ReactNode;
  testID: string;
}) {
  return (
    <View className="mt-6 items-center gap-3" testID={testID}>
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: withAlpha(tint, 0.15) }}
      >
        {icon}
      </View>
      <Text className="text-center text-[17px] font-semibold tracking-[-0.015em] text-text">
        {title}
      </Text>
      <Text className="text-center text-[13px] leading-snug text-text-2">{message}</Text>
      <View className="mt-2 w-full">{action}</View>
    </View>
  );
}

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

  const enterButton = (
    <Button
      text={t('Enter')}
      mode="primary"
      size="auto"
      className="w-full"
      onPress={goToLogin}
      testID="verify-login-button"
    />
  );

  return (
    <AuthShell testID="verify-screen" title={t('VerifyEmailTitle')}>
      {state === 'loading' ? (
        <View className="mt-6 items-center gap-3" testID="verify-loading">
          <ActivityIndicator color={theme.accent} size="large" />
          <Text className="text-center text-[13px] text-text-2">{t('VerifyEmailLoading')}</Text>
        </View>
      ) : null}

      {state === 'success' ? (
        <Result
          testID="verify-success"
          tint={theme.success}
          icon={<CircleCheck size={26} color={theme.success} />}
          title={t('VerifyEmailSuccessTitle')}
          message={t('VerifyEmailSuccessMessage')}
          action={enterButton}
        />
      ) : null}

      {state === 'expired' ? (
        <Result
          testID="verify-expired"
          tint={theme.danger}
          icon={<Clock size={26} color={theme.danger} />}
          title={t('VerifyEmailExpiredTitle')}
          message={t('VerifyEmailExpiredMessage')}
          action={
            <Button
              text={t('ToRegister')}
              mode="primary"
              size="auto"
              className="w-full"
              onPress={goToRegister}
              testID="verify-register-button"
            />
          }
        />
      ) : null}

      {state === 'error' ? (
        <Result
          testID="verify-error"
          tint={theme.danger}
          icon={<CircleX size={26} color={theme.danger} />}
          title={t('VerifyEmailErrorTitle')}
          message={t('VerifyEmailErrorMessage')}
          action={enterButton}
        />
      ) : null}
    </AuthShell>
  );
}
