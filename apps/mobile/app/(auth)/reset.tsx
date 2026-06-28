import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@beyou/validation';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import MobileBrand from '../../src/ui/MobileBrand';
import LanguageToggle from '../../src/ui/LanguageToggle';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { resetPasswordRequest, validateResetTokenRequest } from '../../src/auth/authApi';

interface ResetFormValues {
  password: string;
  confirmPassword: string;
}

type TokenStatus = 'validating' | 'valid' | 'invalid';
const TOKEN_ERROR_KEYS = ['PASSWORD_RESET_TOKEN_EXPIRED', 'PASSWORD_RESET_TOKEN_INVALID'];
const ICON_SIZE = 22;

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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        testID="reset-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
      >
        <Pressable
          onPress={goToLogin}
          accessibilityRole="link"
          accessibilityLabel={t('BackToLogin')}
          className="flex-row items-center gap-1 self-start"
          testID="reset-back-link"
        >
          <Ionicons name="chevron-back" size={ICON_SIZE} color={theme.primary} />
          <Text className="text-primary font-medium">{t('BackToLogin')}</Text>
        </Pressable>

        <Text className="text-3xl font-bold text-secondary text-center mt-6 mb-2">{t('ResetPasswordTitle')}</Text>
        <Text className="text-description text-center mb-8">{t('ResetPasswordSubtitle')}</Text>

        {status === 'validating' ? (
          <View className="items-center gap-3" testID="reset-validating">
            <ActivityIndicator color={theme.primary} />
            <Text className="text-description">{t('ValidatingToken')}</Text>
          </View>
        ) : null}

        {status === 'invalid' ? (
          <View className="items-center gap-4" testID="reset-invalid">
            <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
            <Text className="text-error text-center text-lg">{tokenError}</Text>
            <Button text={t('ForgotPassword')} mode="create" size="big" onPress={goToForgot} testID="reset-forgot-button" />
          </View>
        ) : null}

        {status === 'valid' && !done ? (
          <>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input
                  testID="reset-password-input"
                  accessibilityLabel={t('PasswordPlaceholder')}
                  placeholder={t('PasswordPlaceholder')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  password
                  autoCapitalize="none"
                  autoCorrect={false}
                  iconStart={<Ionicons name="lock-closed-outline" size={ICON_SIZE} color={theme.icon} />}
                  eyeOpen={<Ionicons name="eye-outline" size={ICON_SIZE} color={theme.icon} />}
                  eyeClosed={<Ionicons name="eye-off-outline" size={ICON_SIZE} color={theme.icon} />}
                />
              )}
            />

            <View className="h-5" />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <Input
                  testID="reset-confirm-input"
                  accessibilityLabel={t('ConfirmPasswordPlaceholder')}
                  placeholder={t('ConfirmPasswordPlaceholder')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.confirmPassword?.message}
                  password
                  autoCapitalize="none"
                  autoCorrect={false}
                  iconStart={<Ionicons name="lock-closed-outline" size={ICON_SIZE} color={theme.icon} />}
                  eyeOpen={<Ionicons name="eye-outline" size={ICON_SIZE} color={theme.icon} />}
                  eyeClosed={<Ionicons name="eye-off-outline" size={ICON_SIZE} color={theme.icon} />}
                />
              )}
            />

            <View className="items-center mt-8">
              <Button
                text={t('ResetPasswordTitle')}
                mode="create"
                size="big"
                submitting={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                testID="reset-submit-button"
              />
            </View>
          </>
        ) : null}

        {done ? (
          <View className="items-center gap-4" testID="reset-success">
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.primary} />
            <Text className="text-primary text-center text-lg">{t('PasswordResetSuccess')}</Text>
            <Button text={t('Login')} mode="create" size="big" onPress={goToLogin} testID="reset-login-button" />
          </View>
        ) : null}

        <LanguageToggle />
        <MobileBrand />
      </ScrollView>
    </SafeAreaView>
  );
}
