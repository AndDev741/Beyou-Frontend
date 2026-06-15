import { useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@beyou/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import MobileBrand from '../../src/ui/MobileBrand';
import PasswordHints from '../../src/ui/PasswordHints';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import { register } from '../../src/auth/authSlice';
import type { AppDispatch } from '../../src/store';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

const ICON_SIZE = 22;

export default function RegisterRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const [registered, setRegistered] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema(t)),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async (values: RegisterFormValues) => {
    const res = await dispatch(
      register({ name: values.name, email: values.email, password: values.password }),
    );
    if (register.fulfilled.match(res)) {
      // The user is NOT authenticated yet — email must be verified first. Stay on
      // this route and swap the form for the verify-email success view.
      setRegistered(true);
    } else {
      notify.error(t('RegisterFailed'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        testID="register-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
      >
        <MobileBrand />

        {registered ? (
          <>
            <View
              className="border-2 border-primary rounded-xl bg-primary/10 p-5 mb-6"
              testID="register-success"
            >
              <Text className="text-primary font-semibold mb-1">{t('EmailVerificationSentTitle')}</Text>
              <Text className="text-secondary/80">{t('EmailVerificationSentMessage')}</Text>
            </View>

            <View className="items-center">
              <Button
                text={t('BackToLogin')}
                mode="create"
                size="big"
                onPress={() => router.replace('/(auth)/login')}
                testID="register-success-to-login"
              />
            </View>
          </>
        ) : (
          <>
            <Text className="text-3xl font-bold text-secondary text-center mt-4 mb-8">
              {t('Welcome')} {t('To')}
              <Text className="text-primary"> {t('BeYou')} </Text>
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  testID="register-name-input"
                  accessibilityLabel={t('NamePlaceholder')}
                  placeholder={t('NamePlaceholder')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  autoCapitalize="words"
                  autoCorrect={false}
                  iconStart={<Ionicons name="person-outline" size={ICON_SIZE} color={theme.icon} />}
                />
              )}
            />

            <View className="h-5" />

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  testID="register-email-input"
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
                  testID="register-password-input"
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

            <PasswordHints password={passwordValue} />

            <View className="items-center mt-6">
              <Button
                text={t('ToRegister')}
                mode="create"
                size="big"
                submitting={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                testID="register-submit"
              />

              <View className="mt-4">
                <Button
                  text={t('ComingSoon')}
                  mode="default"
                  size="big"
                  disabled
                  testID="register-google-button"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
