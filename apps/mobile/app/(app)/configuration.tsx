import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import ConfigSection from '../../src/ui/config/ConfigSection';
import ProfileSection from '../../src/ui/config/ProfileSection';
import AppearanceSection from '../../src/ui/config/AppearanceSection';
import { logout } from '../../src/auth/authSlice';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { AppDispatch } from '../../src/store';

const ON_PRIMARY = '#FFFFFF';

/**
 * Configuration / settings screen. Profile lands first (P5-A1); Appearance
 * (A2) and Preferences (A3) slot in below. Logout stays at the bottom.
 */
export default function ConfigurationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingTop: 48, paddingBottom: 40, gap: 28 }}
      testID="config-screen"
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={theme.primary} />
        </Pressable>
        <Text className="text-primary text-2xl font-bold">{t('Config')}</Text>
      </View>

      <ConfigSection
        iconId="lucide:user"
        title={t('ConfigSectionProfile')}
        description={t('ConfigSectionProfileDesc')}
        testID="section-profile"
      >
        <ProfileSection />
      </ConfigSection>

      <ConfigSection
        iconId="lucide:palette"
        title={t('ConfigSectionAppearance')}
        description={t('ConfigSectionAppearanceDesc')}
        testID="section-appearance"
      >
        <AppearanceSection />
      </ConfigSection>

      {/* Preferences (P5-A3) lands here */}

      <Pressable
        onPress={() => dispatch(logout())}
        accessibilityRole="button"
        testID="logout-button"
        className="mt-2 items-center rounded-md bg-error px-8 py-3"
      >
        <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">
          {t('Logout')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
