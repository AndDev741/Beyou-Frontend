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
import { register } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';

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
      <View style={styles.container}>
        <Text style={[styles.title, { color: defaultLight.primary }]}>
          {t('EmailVerificationSentTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: defaultLight.description }]}>
          {t('SuccessRegisterPhrase')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: defaultLight.primary }]}
          onPress={onGoToLogin}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{t('Login')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: defaultLight.primary }]}>
        {t('Register')}
      </Text>

      <TextInput
        style={[styles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('NamePlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        testID="register-name-input"
      />

      <TextInput
        style={[styles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('EmailPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        testID="register-email-input"
      />

      <TextInput
        style={[styles.input, { borderColor: defaultLight.placeholder, color: defaultLight.secondary }]}
        placeholder={t('PasswordPlaceholder')}
        placeholderTextColor={defaultLight.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        testID="register-password-input"
      />

      {authError != null && authError !== 'INVALID_CREDENTIALS' && authError !== 'EMAIL_NOT_VERIFIED' && (
        <Text style={[styles.error, { color: defaultLight.error }]}>
          {t('UnknownError')}
        </Text>
      )}

      <Pressable
        style={[styles.button, { backgroundColor: defaultLight.primary }, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        testID="register-submit-button"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('ToRegister')}</Text>
        )}
      </Pressable>

      <Pressable onPress={onGoToLogin} accessibilityRole="button" testID="go-to-login-link">
        <Text style={[styles.link, { color: defaultLight.primary }]}>
          {t('AlreadyHaveAccount')}
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
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
