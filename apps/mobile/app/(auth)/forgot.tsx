import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@beyou/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import AuthShell from '../../src/ui/auth/AuthShell';
import FormNotice from '../../src/ui/auth/FormNotice';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { forgotPasswordRequest } from '../../src/auth/authApi';

interface ForgotFormValues {
  email: string;
}

const ICON_SIZE = 15;

export default function ForgotRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotPasswordSchema(t)),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    try {
      await forgotPasswordRequest(values.email);
      setSent(true);
    } catch {
      notify.error(t('SomethingWentWrong'));
    }
  };

  const goToLogin = () => router.replace('/(auth)/login');

  return (
    <AuthShell
      testID="forgot-screen"
      title={t('ForgotPasswordTitle')}
      subtitle={t('ForgotPasswordSubtitle')}
      footer={
        <Text
          className="text-[12.5px] font-semibold text-accent"
          accessibilityRole="link"
          onPress={goToLogin}
          testID="forgot-back-link"
        >
          {t('BackToLogin')}
        </Text>
      }
    >
      {sent ? (
        <View className="mt-4">
          <FormNotice
            tone="success"
            title={t('PasswordResetRequestSentTitle')}
            message={t('PasswordResetRequestSuccess')}
            testID="forgot-success"
          />
        </View>
      ) : (
        <View className="mt-4 gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                testID="forgot-email-input"
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

          <Button
            text={t('SendResetLink')}
            mode="primary"
            size="auto"
            className="w-full"
            submitting={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            testID="forgot-submit-button"
          />
        </View>
      )}
    </AuthShell>
  );
}
