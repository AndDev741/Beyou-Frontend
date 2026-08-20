import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@beyou/validation';
import { privacyPolicyUrl } from '@beyou/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Input from '../../src/ui/Input';
import Button from '../../src/ui/Button';
import GoogleSignInButton from '../../src/ui/GoogleSignInButton';
import AuthShell from '../../src/ui/auth/AuthShell';
import FormNotice from '../../src/ui/auth/FormNotice';
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

const ICON_SIZE = 15;

export default function RegisterRoute() {
  const { t, i18n } = useTranslation();
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
    <AuthShell
      testID="register-screen"
      footer={
        <Text className="text-[12.5px] text-text-3">
          {t('AlreadyHaveAccountShort')}{' '}
          <Text
            className="font-semibold text-accent"
            accessibilityRole="link"
            onPress={() => router.replace('/(auth)/login')}
            testID="register-to-login"
          >
            {t('Login')}
          </Text>
        </Text>
      }
    >
      {registered ? (
        <View className="mt-4 gap-4">
          <FormNotice
            tone="success"
            title={t('EmailVerificationSentTitle')}
            message={t('EmailVerificationSentMessage')}
            testID="register-success"
          />
          <Button
            text={t('BackToLogin')}
            mode="primary"
            size="auto"
            className="w-full"
            onPress={() => router.replace('/(auth)/login')}
            testID="register-success-to-login"
          />
        </View>
      ) : (
        <>
          <View className="mt-4 gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  testID="register-name-input"
                  label={t('Name')}
                  accessibilityLabel={t('Name')}
                  placeholder={t('NamePlaceholder')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  autoCapitalize="words"
                  autoCorrect={false}
                  compact
                  iconStart={<Ionicons name="person-outline" size={ICON_SIZE} color={theme.text3} />}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  testID="register-email-input"
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
                  testID="register-password-input"
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

            <PasswordHints password={passwordValue} />

            <Button
              text={t('ToRegister')}
              mode="primary"
              size="auto"
              className="w-full"
              submitting={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              testID="register-submit"
            />

            {/* Under the button rather than a box to tick: the legal basis for what
                Beyou stores is the contract you enter by registering, not consent, so
                what this owes the reader is the information — and a gate on it would
                only be theatre. It has to sit where the eye passes on the way to
                submitting, which is here. */}
            <Text className="text-center text-[12px] leading-snug text-text-3">
              {t('RegisterPrivacyNotice')}{' '}
              <Text
                className="font-semibold text-accent"
                accessibilityRole="link"
                onPress={() => Linking.openURL(privacyPolicyUrl(i18n.language))}
                testID="register-privacy-link"
              >
                {t('PrivacyPolicy')}
              </Text>
              .
            </Text>
          </View>

          <GoogleSignInButton />
        </>
      )}
    </AuthShell>
  );
}
