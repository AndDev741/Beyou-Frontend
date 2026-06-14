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
import { login } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';
import RegisterScreen from './RegisterScreen';
import authStyles, { ON_PRIMARY } from './authStyles';

export default function LoginScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector((s: RootState) => s.auth.error);
  const needsVerification = useSelector((s: RootState) => s.auth.needsVerification);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterScreen onGoToLogin={() => setShowRegister(false)} />;
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await dispatch(login({ email, password }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={authStyles.container}>
      <Text style={[authStyles.title, { color: defaultLight.primary }]}>
        {t('Login')}
      </Text>

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
        testID="login-email-input"
      />

      <TextInput
        style={[authStyles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('PasswordPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        accessibilityLabel={t('PasswordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        testID="login-password-input"
      />

      {error === 'INVALID_CREDENTIALS' && (
        <Text style={[authStyles.error, { color: defaultLight.error }]} testID="login-invalid-credentials-error">
          {t('WrongPassOrEmailError')}
        </Text>
      )}

      {needsVerification && (
        <Text style={[authStyles.error, { color: defaultLight.error }]} testID="login-verify-email-message">
          {t('EmailNotVerifiedMessage')}
        </Text>
      )}

      <Pressable
        style={[authStyles.button, { backgroundColor: defaultLight.primary }, submitting && authStyles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        testID="login-submit-button"
      >
        {submitting ? (
          <ActivityIndicator color={ON_PRIMARY} />
        ) : (
          <Text style={authStyles.buttonText}>{t('Enter')}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setShowRegister(true)}
        accessibilityRole="button"
        testID="go-to-register-link"
      >
        <Text style={[authStyles.link, { color: defaultLight.primary }]}>
          {t('NoAccount')}
        </Text>
      </Pressable>
    </View>
  );
}
