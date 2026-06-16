import { useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@beyou/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import MobileBrand from '../../src/ui/MobileBrand';
import LanguageToggle from '../../src/ui/LanguageToggle';
import AuthTabs from '../../src/ui/AuthTabs';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { login } from '../../src/auth/authSlice';
import type { AppDispatch } from '../../src/store';

interface LoginFormValues {
  email: string;
  password: string;
}

const ICON_SIZE = 22;

export default function LoginRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const [emailNotVerified, setEmailNotVerified] = useState(false);

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
    setEmailNotVerified(false);
    const res = await dispatch(login({ email: values.email, password: values.password }));
    if (login.rejected.match(res)) {
      if (res.payload === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
      } else {
        notify.error(t('WrongPassOrEmailError'));
      }
    }
    // On success the slice sets status -> 'authenticated'; the root-layout Gate
    // redirects to /(app). DO NOT navigate manually here.
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        testID="login-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
      >
        <AuthTabs active="login" />

        <Text className="text-3xl font-bold text-secondary text-center mt-6 mb-8">
          {t('Welcome')}
          <Text className="text-primary"> {t('Back!')} </Text>
        </Text>

        {emailNotVerified ? (
          <View
            className="border-2 border-error rounded-xl bg-error/10 p-4 mb-6"
            testID="login-email-not-verified"
          >
            <Text className="text-error font-semibold mb-1">{t('EmailNotVerifiedTitle')}</Text>
            <Text className="text-secondary/80">{t('EmailNotVerifiedMessage')}</Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              testID="login-email-input"
              accessibilityLabel={t('EmailPlaceholder')}
              placeholder={t('EmailPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              iconStart={<Ionicons name="mail-outline" size={ICON_SIZE} color={theme.icon} />}
            />
          )}
        />

        <View className="h-5" />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              testID="login-password-input"
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

        <Pressable
          onPress={() => router.push('/(auth)/forgot')}
          accessibilityRole="link"
          className="self-end mt-3 mb-6"
          testID="login-forgot-link"
        >
          <Text className="text-primary underline font-medium">{t('ForgotPassword')}</Text>
        </Pressable>

        <View className="items-center">
          <Button
            text={t('Enter')}
            mode="create"
            size="big"
            submitting={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            testID="login-submit-button"
          />

          <View className="mt-4">
            <Button
              text={t('ComingSoon')}
              mode="default"
              size="big"
              disabled
              testID="login-google-button"
            />
          </View>
        </View>
        <LanguageToggle />
        <MobileBrand />
      </ScrollView>
    </SafeAreaView>
  );
}
