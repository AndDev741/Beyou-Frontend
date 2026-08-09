import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@beyou/validation';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import AuthShell from '../../src/ui/auth/AuthShell';
import FormNotice from '../../src/ui/auth/FormNotice';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { resetPasswordRequest, validateResetTokenRequest } from '../../src/auth/authApi';

interface ResetFormValues {
  password: string;
  confirmPassword: string;
}

type TokenStatus = 'validating' | 'valid' | 'invalid';
const TOKEN_ERROR_KEYS = ['PASSWORD_RESET_TOKEN_EXPIRED', 'PASSWORD_RESET_TOKEN_INVALID'];
const ICON_SIZE = 15;

export default function ResetRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<TokenStatus>('validating');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetPasswordSchema(t)),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        if (active) {
          setStatus('invalid');
          setTokenError(t('ResetPasswordInvalid'));
        }
        return;
      }
      const res = await validateResetTokenRequest(token);
      if (!active) return;
      if (res.error) {
        setStatus('invalid');
        setTokenError(getFriendlyErrorMessage(t, res.error));
      } else {
        setStatus('valid');
      }
    })();
    return () => {
      active = false;
    };
  }, [token, t]);

  const onSubmit = async (values: ResetFormValues) => {
    if (!token) return;
    const res = await resetPasswordRequest(token, values.password);
    if (res.error) {
      if (res.error.errorKey && TOKEN_ERROR_KEYS.includes(res.error.errorKey)) {
        setStatus('invalid');
        setTokenError(getFriendlyErrorMessage(t, res.error));
        return;
      }
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    setDone(true);
  };

  const goToLogin = () => router.replace('/(auth)/login');
  const goToForgot = () => router.replace('/(auth)/forgot');

  return (
    <AuthShell
      testID="reset-screen"
      title={t('ResetPasswordTitle')}
      subtitle={t('ResetPasswordSubtitle')}
      footer={
        <Text
          className="text-[12.5px] font-semibold text-accent"
          accessibilityRole="link"
          onPress={goToLogin}
          testID="reset-back-link"
        >
          {t('BackToLogin')}
        </Text>
      }
    >
      {status === 'validating' ? (
        <View className="mt-4">
          <FormNotice tone="loading" message={t('ValidatingToken')} testID="reset-validating" />
        </View>
      ) : null}

      {status === 'invalid' && tokenError ? (
        <View className="mt-4 gap-3" testID="reset-invalid">
          <FormNotice tone="error" message={tokenError} />
          <Text
            className="text-center text-[12.5px] font-semibold text-accent"
            accessibilityRole="link"
            onPress={goToForgot}
            testID="reset-forgot-link"
          >
            {t('ForgotPassword')}
          </Text>
        </View>
      ) : null}

      {status === 'valid' && !done ? (
        <View className="mt-4 gap-4">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                testID="reset-password-input"
                label={t('Password')}
                accessibilityLabel={t('Password')}
                placeholder={t('PasswordPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                password
                autoCapitalize="none"
                autoCorrect={false}
                compact
                iconStart={
                  <Ionicons name="lock-closed-outline" size={ICON_SIZE} color={theme.text3} />
                }
                eyeOpen={<Ionicons name="eye-outline" size={ICON_SIZE} color={theme.text3} />}
                eyeClosed={<Ionicons name="eye-off-outline" size={ICON_SIZE} color={theme.text3} />}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <Input
                testID="reset-confirm-input"
                label={t('ConfirmPassword')}
                accessibilityLabel={t('ConfirmPassword')}
                placeholder={t('ConfirmPasswordPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.confirmPassword?.message}
                password
                autoCapitalize="none"
                autoCorrect={false}
                compact
                iconStart={
                  <Ionicons name="lock-closed-outline" size={ICON_SIZE} color={theme.text3} />
                }
                eyeOpen={<Ionicons name="eye-outline" size={ICON_SIZE} color={theme.text3} />}
                eyeClosed={<Ionicons name="eye-off-outline" size={ICON_SIZE} color={theme.text3} />}
              />
            )}
          />

          <Button
            text={t('ResetPasswordTitle')}
            mode="primary"
            size="auto"
            className="w-full"
            submitting={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            testID="reset-submit-button"
          />
        </View>
      ) : null}

      {done ? (
        <View className="mt-4 gap-4">
          <FormNotice
            tone="success"
            message={t('PasswordResetSuccess')}
            testID="reset-success"
          />
          <Button
            text={t('Login')}
            mode="primary"
            size="auto"
            className="w-full"
            onPress={goToLogin}
            testID="reset-login-button"
          />
        </View>
      ) : null}
    </AuthShell>
  );
}
