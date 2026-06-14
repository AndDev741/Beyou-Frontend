import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';
import { register } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';
import authStyles, { ON_PRIMARY } from './authStyles';

interface RegisterScreenProps {
  onGoToLogin: () => void;
}

export default function RegisterScreen({ onGoToLogin }: RegisterScreenProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const authError = useSelector((s: RootState) => s.auth.error);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await dispatch(register({ name, email, password }));
      if (register.fulfilled.match(result)) {
        setRegistered(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (registered) {
    return (
      <View style={authStyles.container}>
        <Text style={[authStyles.title, { color: defaultLight.primary }]}>
          {t('EmailVerificationSentTitle')}
        </Text>
        <Text style={[authStyles.subtitle, { color: defaultLight.description }]}>
          {t('SuccessRegisterPhrase')}
        </Text>
        <Pressable
          style={[authStyles.button, { backgroundColor: defaultLight.primary }]}
          onPress={onGoToLogin}
          accessibilityRole="button"
          testID="register-success-to-login"
        >
          <Text style={authStyles.buttonText}>{t('Login')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={authStyles.container}>
      <Text style={[authStyles.title, { color: defaultLight.primary }]}>
        {t('Register')}
      </Text>

      <TextInput
        style={[authStyles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('NamePlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        accessibilityLabel={t('NamePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        testID="register-name-input"
      />

      <TextInput
        style={[authStyles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('EmailPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        accessibilityLabel={t('EmailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        testID="register-email-input"
      />

      <TextInput
        style={[authStyles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('PasswordPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        accessibilityLabel={t('PasswordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        testID="register-password-input"
      />

      {authError != null && authError !== 'INVALID_CREDENTIALS' && authError !== 'EMAIL_NOT_VERIFIED' && (
        <Text style={[authStyles.error, { color: defaultLight.error }]}>
          {t('UnknownError')}
        </Text>
      )}

      <Pressable
        style={[authStyles.button, { backgroundColor: defaultLight.primary }, submitting && authStyles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        testID="register-submit-button"
      >
        {submitting ? (
          <ActivityIndicator color={ON_PRIMARY} />
        ) : (
          <Text style={authStyles.buttonText}>{t('ToRegister')}</Text>
        )}
      </Pressable>

      <Pressable onPress={onGoToLogin} accessibilityRole="button" testID="go-to-login-link">
        <Text style={[authStyles.link, { color: defaultLight.primary }]}>
          {t('AlreadyHaveAccount')}
        </Text>
      </Pressable>
    </View>
  );
}
