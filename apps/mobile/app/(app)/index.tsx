import { View, Text, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';
import { logout } from '../../src/auth/authSlice';
import type { RootState, AppDispatch } from '../../src/store';

const ON_PRIMARY = '#FFFFFF';

/**
 * Temporary authenticated dashboard. Carries over the Phase 1
 * AuthedPlaceholderScreen content (profile name + logout) until the real
 * dashboard increment. Replaces src/screens/AuthedPlaceholderScreen.tsx.
 */
export default function AppHome() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((s: RootState) => s.auth.profile);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: defaultLight.background }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 32, textAlign: 'center', color: defaultLight.primary }}>
        {t('HelloUser', { name: profile?.name ?? '' })}
      </Text>
      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 48, color: defaultLight.description }}>
        {t('BeYourBestVersion')}
      </Text>
      <Pressable
        style={{ borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', backgroundColor: defaultLight.error }}
        onPress={() => dispatch(logout())}
        accessibilityRole="button"
        testID="logout-button"
      >
        <Text style={{ color: ON_PRIMARY, fontSize: 16, fontWeight: '600' }}>{t('Logout')}</Text>
      </Pressable>
    </View>
  );
}
