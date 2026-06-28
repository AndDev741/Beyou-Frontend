import { useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@beyou/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import MobileBrand from '../../src/ui/MobileBrand';
import LanguageToggle from '../../src/ui/LanguageToggle';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { forgotPasswordRequest } from '../../src/auth/authApi';

interface ForgotFormValues {
  email: string;
}

const ICON_SIZE = 22;

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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        testID="forgot-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
      >
        <Pressable
          onPress={goToLogin}
          accessibilityRole="link"
          accessibilityLabel={t('BackToLogin')}
          className="flex-row items-center gap-1 self-start"
          testID="forgot-back-link"
        >
          <Ionicons name="chevron-back" size={ICON_SIZE} color={theme.primary} />
          <Text className="text-primary font-medium">{t('BackToLogin')}</Text>
        </Pressable>

        <Text className="text-3xl font-bold text-secondary text-center mt-6 mb-2">
          {t('ForgotPasswordTitle')}
        </Text>
        <Text className="text-description text-center mb-8">{t('ForgotPasswordSubtitle')}</Text>

        {sent ? (
          <View className="items-center gap-4" testID="forgot-success">
            <Ionicons name="mail-unread-outline" size={48} color={theme.primary} />
            <Text className="text-primary text-center text-lg">{t('PasswordResetRequestSuccess')}</Text>
            <Button text={t('BackToLogin')} mode="create" size="big" onPress={goToLogin} testID="forgot-back-button" />
          </View>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  testID="forgot-email-input"
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

            <View className="items-center mt-6">
              <Button
                text={t('SendResetLink')}
                mode="create"
                size="big"
                submitting={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                testID="forgot-submit-button"
              />
            </View>
          </>
        )}

        <LanguageToggle />
        <MobileBrand />
      </ScrollView>
    </SafeAreaView>
  );
}
