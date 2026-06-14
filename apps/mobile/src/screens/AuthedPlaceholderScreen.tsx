import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';
import { logout } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';

export default function AuthedPlaceholderScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((s: RootState) => s.auth.profile);

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: defaultLight.primary }]}>
        {t('HelloUser', { name: profile?.name ?? '' })}
      </Text>
      <Text style={[styles.subtitle, { color: defaultLight.description }]}>
        {t('BeYourBestVersion')}
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: defaultLight.error }]}
        onPress={() => dispatch(logout())}
        accessibilityRole="button"
        testID="logout-button"
      >
        <Text style={styles.buttonText}>{t('Logout')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: defaultLight.background,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
