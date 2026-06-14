import { View, Text, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { defaultLight } from '@beyou/theme';
import { logout } from '../auth/authSlice';
import type { RootState, AppDispatch } from '../store';
import authStyles, { ON_PRIMARY } from './authStyles';

export default function AuthedPlaceholderScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((s: RootState) => s.auth.profile);

  return (
    <View style={[authStyles.container, { alignItems: 'center' }]}>
      <Text style={[authStyles.title, { color: defaultLight.primary }]}>
        {t('HelloUser', { name: profile?.name ?? '' })}
      </Text>
      <Text style={[authStyles.subtitle, { color: defaultLight.description, marginBottom: 48 }]}>
        {t('BeYourBestVersion')}
      </Text>
      <Pressable
        style={[authStyles.button, { backgroundColor: defaultLight.error, paddingHorizontal: 32 }]}
        onPress={() => dispatch(logout())}
        accessibilityRole="button"
        testID="logout-button"
      >
        <Text style={[authStyles.buttonText, { color: ON_PRIMARY }]}>{t('Logout')}</Text>
      </Pressable>
    </View>
  );
}
