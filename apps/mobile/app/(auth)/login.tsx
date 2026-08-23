import { useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@beyou/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import GoogleSignInButton from '../../src/ui/GoogleSignInButton';
import AuthShell from '../../src/ui/auth/AuthShell';
import FormNotice from '../../src/ui/auth/FormNotice';
import useResendVerification from '../../src/auth/useResendVerification';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { login } from '../../src/auth/authSlice';
import type { AppDispatch } from '../../src/store';
import { RATE_LIMIT_ERROR_KEY } from '@beyou/api/apiError';

interface LoginFormValues {
  email: string;
  password: string;
}

const ICON_SIZE = 15;

export default function LoginRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const {
    status: resendStatus,
    secondsLeft,
    resend,
    disabled: resendDisabled,
  } = useResendVerification(unverifiedEmail ?? '');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema(t)),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setUnverifiedEmail(null);
    const res = await dispatch(login({ email: values.email, password: values.password }));
    if (login.rejected.match(res)) {
      if (res.payload === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email);
      } else if (res.payload === RATE_LIMIT_ERROR_KEY) {
        // notify replaces whatever toast is showing, so without this branch the
        // transport's correct "too many requests" was overwritten a moment later
        // by "wrong email or password".
        notify.error(t(RATE_LIMIT_ERROR_KEY));
      } else {
        notify.error(t('WrongPassOrEmailError'));
      }
    }
    // On success the slice sets status -> 'authenticated'; the root-layout Gate
    // redirects to /(app). DO NOT navigate manually here.
  };

  return (
    <AuthShell
      testID="login-screen"
      footer={
        <Text className="text-[12.5px] text-text-3">
          {t('NewHere')}{' '}
          <Text
            className="font-semibold text-accent"
            accessibilityRole="link"
            onPress={() => router.replace('/(auth)/register')}
            testID="login-to-register"
          >
            {t('ToRegister')}
          </Text>
        </Text>
      }
    >
      {unverifiedEmail !== null ? (
        <View className="mt-4">
          <FormNotice
            tone={resendStatus === 'sent' ? 'success' : 'error'}
            title={t('EmailNotVerifiedTitle')}
            message={
              resendStatus === 'sent'
                ? t('ResendVerificationSent')
                : resendStatus === 'error'
                  ? t('ResendVerificationError')
                  : t('EmailNotVerifiedMessage')
            }
            testID="login-email-not-verified"
            action={
              unverifiedEmail ? (
                <Text
                  className={`text-[12.5px] font-semibold text-accent ${resendDisabled ? 'opacity-60' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: resendDisabled }}
                  onPress={resendDisabled ? undefined : resend}
                  testID="login-resend-verification"
                >
                  {resendStatus === 'sending'
                    ? t('ResendVerificationSending')
                    : secondsLeft > 0
                      ? t('ResendVerificationWait', { seconds: secondsLeft })
                      : t('ResendVerificationAction')}
                </Text>
              ) : null
            }
          />
        </View>
      ) : null}

      <View className="mt-4 gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              testID="login-email-input"
              label={t('Email')}
              accessibilityLabel={t('Email')}
              placeholder={t('EmailPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              compact
              iconStart={<Ionicons name="mail-outline" size={ICON_SIZE} color={theme.text3} />}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              testID="login-password-input"
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
              iconStart={<Ionicons name="lock-closed-outline" size={ICON_SIZE} color={theme.text3} />}
              eyeOpen={<Ionicons name="eye-outline" size={ICON_SIZE} color={theme.text3} />}
              eyeClosed={<Ionicons name="eye-off-outline" size={ICON_SIZE} color={theme.text3} />}
            />
          )}
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot')}
          accessibilityRole="link"
          className="-mt-1 self-end"
          testID="login-forgot-link"
        >
          <Text className="text-xs text-text-2">{t('ForgotPassword')}</Text>
        </Pressable>

        <Button
          text={t('Enter')}
          mode="primary"
          size="auto"
          className="w-full"
          submitting={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          testID="login-submit-button"
        />
      </View>

      <GoogleSignInButton />
    </AuthShell>
  );
}
