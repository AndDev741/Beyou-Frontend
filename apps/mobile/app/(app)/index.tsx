import { useCallback, useRef } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const dash = useDashboardTutorial();
  // The spotlight is rendered by the (app) layout so it spans the window (the
  // last dashboard step targets the bottom bar, which is outside this screen).
  // Suppressed while the spinner is up: the targets are not mounted yet, and the
  // overlay would flash a full-screen scrim over the loading state.
  useSpotlightSlot({ ...dash, active: dash.active && !loading });

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
        // O disco do assistente sobe 18px para fora da barra e cobriria a
        // última linha do conteúdo; o respiro extra devolve esse espaço.
        contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40, gap: 20 }}
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
    </View>
  );
}
