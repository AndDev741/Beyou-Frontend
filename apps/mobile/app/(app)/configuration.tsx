import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { ChevronLeft, LayoutGrid, LogOut, Palette, Settings } from 'lucide-react-native';
import ConfigSection from '../../src/ui/config/ConfigSection';
import DangerZoneSection from '../../src/ui/config/DangerZoneSection';
import ProfileHeaderRow from '../../src/ui/config/ProfileHeaderRow';
import IconTile from '../../src/ui/IconTile';
import ProfileSection from '../../src/ui/config/ProfileSection';
import AppearanceSection from '../../src/ui/config/AppearanceSection';
import LanguageSection from '../../src/ui/config/LanguageSection';
import RoutineSettingsSection from '../../src/ui/config/RoutineSettingsSection';
import ConstanceSection from '../../src/ui/config/ConstanceSection';
import NotificationSection from '../../src/ui/config/NotificationSection';
import WidgetsSection from '../../src/ui/config/WidgetsSection';
import TutorialSection from '../../src/ui/config/TutorialSection';
import PrivacyPolicySection from '../../src/ui/config/PrivacyPolicySection';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import { useConfigTutorial } from '../../src/tutorial/hooks/useConfigTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import { logout } from '../../src/auth/authSlice';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { AppDispatch } from '../../src/store';

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
  // Rendered by the (app) layout so the overlay spans the window — target
  // rects come from measureInWindow, and the bottom bar is outside this screen.
  useSpotlightSlot(cfg);

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
    <View className="flex-1 bg-bg">
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-bg"
        contentContainerStyle={{ padding: 16, paddingTop: 48, paddingBottom: 40, gap: 12 }}
        testID="config-screen"
      >
        <View className="mb-1 flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <ChevronLeft size={24} color={theme.text2} />
          </Pressable>
          <View className="min-w-0">
            <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
              {t('Configuration')}
            </Text>
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {t('ConfigSubtitle')}
            </Text>
          </View>
        </View>

        {/* The mockup's order: profile, appearance, preferences, widgets and, last,
            log out. The e-mail shows up nowhere. */}
        <ConfigSection
          title={t('ConfigSectionProfile')}
          header={<ProfileHeaderRow />}
          testID="section-profile"
          viewRef={profileRef}
          onLayout={onSectionLayout('config-profile')}
        >
          <ProfileSection />
        </ConfigSection>

        <ConfigSection
          icon={<Palette size={16} color={theme.accent} />}
          title={t('ConfigSectionAppearance')}
          testID="section-appearance"
          viewRef={appearanceRef}
          onLayout={onSectionLayout('config-appearance')}
        >
          <AppearanceSection />
        </ConfigSection>

        <ConfigSection
          icon={<Settings size={16} color={theme.accent} />}
          title={t('ConfigSectionPreferences')}
          testID="section-preferences"
          viewRef={preferencesRef}
          onLayout={onSectionLayout('config-preferences')}
        >
          <View className="gap-6">
            <LanguageSection />
            <ConstanceSection />
            <NotificationSection />
            <RoutineSettingsSection />
            <TutorialSection />
            <PrivacyPolicySection />
          </View>
        </ConfigSection>

        <DangerZoneSection />

        <ConfigSection
          icon={<LayoutGrid size={16} color={theme.accent} />}
          title={t('ConfigSectionWidgets')}
          testID="section-dashboard"
          viewRef={dashboardRef}
          onLayout={onSectionLayout('config-dashboard')}
        >
          <WidgetsSection />
        </ConfigSection>

        {/* Log out closes the list, in the destructive tone and on one row — as on the web. */}
        <Pressable
          onPress={() => dispatch(logout())}
          accessibilityRole="button"
          accessibilityLabel={t('Logout')}
          testID="logout-button"
          ref={tutorialRef}
          onLayout={onSectionLayout('config-tutorial')}
          className="w-full flex-row items-center gap-3 rounded-card border border-border bg-surface p-4 active:bg-surface-2"
        >
          <IconTile tone="neutral" size={36} className="bg-danger/10">
            <LogOut size={16} color={theme.danger} />
          </IconTile>
          <Text className="text-[14px] font-semibold text-danger">{t('Logout')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
