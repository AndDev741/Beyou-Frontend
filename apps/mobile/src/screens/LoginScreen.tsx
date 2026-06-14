import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';
import { login } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';
import RegisterScreen from './RegisterScreen';

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
    <View style={styles.container}>
      <Text style={[styles.title, { color: defaultLight.primary }]}>
        {t('Login')}
      </Text>

      <TextInput
        style={[styles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('EmailPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        testID="login-email-input"
      />

      <TextInput
        style={[styles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('PasswordPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        testID="login-password-input"
      />

      {error === 'INVALID_CREDENTIALS' && (
        <Text style={[styles.error, { color: defaultLight.error }]} testID="login-invalid-credentials-error">
          {t('WrongPassOrEmailError')}
        </Text>
      )}

      {needsVerification && (
        <Text style={[styles.error, { color: defaultLight.error }]} testID="login-verify-email-message">
          {t('EmailNotVerifiedMessage')}
        </Text>
      )}

      <Pressable
        style={[styles.button, { backgroundColor: defaultLight.primary }, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        testID="login-submit-button"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('Enter')}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setShowRegister(true)}
        accessibilityRole="button"
        testID="go-to-register-link"
      >
        <Text style={[styles.link, { color: defaultLight.primary }]}>
          {t('NoAccount')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: defaultLight.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  link: {
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
