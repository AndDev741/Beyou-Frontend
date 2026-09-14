import { useCallback, useRef } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '../../src/dashboard/useDashboardData';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import ProfileHeader from '../../src/ui/dashboard/ProfileHeader';
import RoutineDay from '../../src/ui/dashboard/RoutineDay';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';
import DashboardGoals from '../../src/ui/dashboard/DashboardGoals';
import DashboardWidgets from '../../src/ui/widgets/DashboardWidgets';
import OnboardingTutorial from '../../src/ui/tutorial/OnboardingTutorial';
import AiOnboardingWizard from '../../src/ui/aiOnboarding/AiOnboardingWizard';
import TutorialFinale from '../../src/ui/tutorial/TutorialFinale';
import DailyBriefingSheet from '../../src/ui/briefing/DailyBriefingSheet';
import { useDailyBriefing } from '../../src/dashboard/useDailyBriefing';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import { useDashboardTutorial } from '../../src/tutorial/hooks/useDashboardTutorial';
import { setPhase } from '../../src/tutorial/tutorialSlice';
import { completeTutorial } from '../../src/tutorial/completeTutorial';
import type { RootState, AppDispatch } from '../../src/store';

/**
 * Dashboard home: loads profile + today's routine + lists on mount
 * (useDashboardData), then renders the profile header, today's routine (the
 * check-in loop), and shortcuts. CelebrationOverlay overlays level-up / streak
 * celebrations queued by check-ins.
 */
export default function AppHome() {
  const { loading, reload } = useDashboardData();
  const { theme } = useBeyouTheme();
  const firstFocus = useRef(true);
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const dash = useDashboardTutorial();
  // The spotlight is rendered by the (app) layout so it spans the window (the
  // last dashboard step targets the bottom bar, which is outside this screen).
  // Suppressed while the spinner is up: the targets are not mounted yet, and the
  // overlay would flash a full-screen scrim over the loading state.
  useSpotlightSlot({ ...dash, active: dash.active && !loading });

  // The new-day dialog. Any tutorial phase at all suppresses it: every one of them owns
  // the screen with its own overlay, and an account new enough to be in one has no
  // yesterday to report. A retroactive check reloads the dashboard, because the XP and
  // streak it just moved are on this screen too.
  // `?briefing=1` is the configuration screen asking for today's sheet back, for somebody who
  // dismissed it by accident. Consumed on close rather than left on the route, so returning to
  // the dashboard later does not keep reopening it.
  const params = useLocalSearchParams<{ briefing?: string }>();
  const router = useRouter();
  const briefingRequested = params.briefing === '1';
  const dropBriefingRequest = useCallback(() => {
    if (briefingRequested) router.replace('/');
  }, [briefingRequested, router]);

  const {
    briefing,
    visible: briefingVisible,
    close: closeBriefing,
    resolve: resolveBriefingItem,
    pendingId: briefingPendingId,
  } = useDailyBriefing({
    tutorialActive: phase !== null,
    forceOpen: briefingRequested,
    onResolved: reload,
    onClosed: dropBriefingRequest,
  });

  // Refetch when returning to the dashboard (e.g. after editing a routine). The
  // screen stays mounted under the stack, so the mount-load goes stale otherwise.
  // Skip the first focus — useDashboardData already loads on mount — and stay
  // silent (reload doesn't toggle the spinner), so there's no flash on return.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg" testID="dashboard-loading">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 bg-bg"
        // The assistant's disc rises 18px out of the bar and would cover the
        // content's last row; the extra breathing room gives that space back.
        // 12 at the sides and not 16: the routine is the densest content on screen and
        // gains 8dp of usable width. Same measure as the web on phones (px-3).
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 56,
          paddingBottom: 40,
          gap: 20,
        }}
        testID="dashboard-screen"
      >
        <ProfileHeader />
        <RoutineDay />
        <DashboardWidgets />
        <DashboardGoals />
      </ScrollView>
      {/* The bottom bar used to be rendered here. It moved to the (app) layout
          so every authenticated screen gets it — see the comment there. */}
      <CelebrationOverlay />
      {phase === 'intro' ? (
        <OnboardingTutorial
          onComplete={() => dispatch(setPhase('dashboard'))}
          onSkip={() => completeTutorial({ dispatch, t })}
          onChooseAi={() => dispatch(setPhase('ai'))}
        />
      ) : null}
      {phase === 'ai' ? (
        <AiOnboardingWizard
          visible
          onFinish={() => completeTutorial({ dispatch, t })}
          onTakeTour={() => dispatch(setPhase('dashboard'))}
          onClosed={reload}
        />
      ) : null}
      {phase === 'done' ? <TutorialFinale /> : null}
      {/* Mounted only while it should be on screen. The gate already refuses a briefing it
          cannot read, so keeping the sheet unmounted means a shape nobody expected can never
          reach a render on the app's home screen. */}
      {briefing && briefingVisible ? (
        <DailyBriefingSheet
          briefing={briefing}
          visible
          onClose={closeBriefing}
          onResolve={resolveBriefingItem}
          pendingId={briefingPendingId}
          locale={i18n.language === 'pt' ? 'pt-BR' : 'en-US'}
        />
      ) : null}
    </View>
  );
}
