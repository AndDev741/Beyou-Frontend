import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import ConfigSection from '../../src/ui/config/ConfigSection';
import ProfileSection from '../../src/ui/config/ProfileSection';
import AppearanceSection from '../../src/ui/config/AppearanceSection';
import LanguageSection from '../../src/ui/config/LanguageSection';
import RoutineSettingsSection from '../../src/ui/config/RoutineSettingsSection';
import ConstanceSection from '../../src/ui/config/ConstanceSection';
import WidgetsSection from '../../src/ui/config/WidgetsSection';
import TutorialSection from '../../src/ui/config/TutorialSection';
import SpotlightOverlay from '../../src/ui/tutorial/SpotlightOverlay';
import { useConfigTutorial } from '../../src/tutorial/hooks/useConfigTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
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
  const cfg = useConfigTutorial();

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const profileRef = useTutorialTarget('config-profile');
  const appearanceRef = useTutorialTarget('config-appearance');
  const preferencesRef = useTutorialTarget('config-preferences');
  const dashboardRef = useTutorialTarget('config-dashboard');
  const tutorialRef = useTutorialTarget('config-tutorial');

  // Scroll the current section into view so its spotlight ring is visible.
  const currentTargetId = cfg.active ? cfg.steps[cfg.stepIndex]?.targetId : undefined;
  useEffect(() => {
    if (!cfg.active || !currentTargetId) return;
    const y = offsets.current[currentTargetId];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  }, [cfg.active, currentTargetId]);

  const onSectionLayout = (id: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    offsets.current[id] = e.nativeEvent.layout.y;
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
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
          viewRef={profileRef}
          onLayout={onSectionLayout('config-profile')}
        >
          <ProfileSection />
        </ConfigSection>

        <ConfigSection
          iconId="lucide:palette"
          title={t('ConfigSectionAppearance')}
          description={t('ConfigSectionAppearanceDesc')}
          testID="section-appearance"
          viewRef={appearanceRef}
          onLayout={onSectionLayout('config-appearance')}
        >
          <AppearanceSection />
        </ConfigSection>

        <ConfigSection
          iconId="lucide:settings"
          title={t('ConfigSectionPreferences')}
          description={t('ConfigSectionPreferencesDesc')}
          testID="section-preferences"
          viewRef={preferencesRef}
          onLayout={onSectionLayout('config-preferences')}
        >
          <View className="gap-6">
            <LanguageSection />
            <RoutineSettingsSection />
            <ConstanceSection />
          </View>
        </ConfigSection>

        <ConfigSection
          iconId="lucide:layout-grid"
          title={t('ConfigSectionDashboard')}
          description={t('ConfigSectionDashboardDesc')}
          testID="section-dashboard"
          viewRef={dashboardRef}
          onLayout={onSectionLayout('config-dashboard')}
        >
          <WidgetsSection />
        </ConfigSection>

        <ConfigSection
          iconId="lucide:graduation-cap"
          title={t('Tutorial')}
          description={t('TutorialDescription')}
          testID="section-tutorial"
          viewRef={tutorialRef}
          onLayout={onSectionLayout('config-tutorial')}
        >
          <TutorialSection />
        </ConfigSection>

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

      {cfg.active ? (
        <SpotlightOverlay
          step={cfg.steps[cfg.stepIndex]}
          stepIndex={cfg.stepIndex}
          stepCount={cfg.steps.length}
          onNext={cfg.next}
          onPrev={cfg.prev}
          onSkip={cfg.skip}
        />
      ) : null}
    </View>
  );
}
