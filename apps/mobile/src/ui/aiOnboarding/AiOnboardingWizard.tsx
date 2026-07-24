import { useContext, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Sparkles, AlertTriangle, RotateCcw, Compass } from 'lucide-react-native';
import fetchOnboardingSuggestions from '@beyou/api/onboarding/fetchOnboardingSuggestions';
import { createCategoriesFromSuggestions } from '@beyou/state/onboarding/createFromSuggestions';
import type { HabitSuggestion, TaskSuggestion } from '@beyou/types/onboarding/suggestions';
import {
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  type StoredWizardProgress,
  type WizardStep,
} from '../../lib/aiOnboardingStore';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';
import CategoriesStep from './CategoriesStep';
import BusyOverlay from './BusyOverlay';

const ON_PRIMARY = '#FFFFFF';

export type WizardData = StoredWizardProgress['data'];

const STEP_ORDER: WizardStep[] = ['categories', 'habitsTasks', 'routine', 'goals', 'summary'];

const STEP_LABEL_KEYS: Record<WizardStep, string> = {
  categories: 'AiOnboardingStepCategories',
  habitsTasks: 'AiOnboardingStepHabitsTasks',
  routine: 'AiOnboardingStepRoutine',
  goals: 'AiOnboardingStepGoals',
  summary: 'AiOnboardingStepSummary',
};

interface AiOnboardingWizardProps {
  visible: boolean;
  /** Persist tutorial completion (e.g. completeTutorial); awaited before clearing progress. */
  onFinish: () => Promise<unknown> | void;
  /** Exit toward the manual tour (also the error-banner fallback target, like web). */
  onTakeTour: () => void;
  /** Called on EVERY exit path (finish/tour/fallback) so the dashboard can reload. */
  onClosed: () => void;
}

const emptyData = (): WizardData => ({
  categories: [],
  habits: [],
  tasks: [],
  goals: [],
  freeTexts: [],
});

/**
 * AI-personalized onboarding wizard (mobile port of the web AiOnboardingWizard
 * state machine). Entities are created for real at each step; progress is
 * persisted so an app restart resumes the interrupted step instead of
 * duplicating them. Mobile delta: hydration from SecureStore is ASYNC — no
 * step renders, nothing fetches and nothing persists until `hydrated`.
 */
export default function AiOnboardingWizard({
  visible,
  onFinish,
  onTakeTour,
  onClosed,
}: AiOnboardingWizardProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);

  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<WizardStep>('categories');
  const [data, setData] = useState<WizardData>(emptyData);
  const [busy, setBusy] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState(false);
  const [suggestedHabitsTasks, setSuggestedHabitsTasks] = useState<{
    habits: HabitSuggestion[];
    tasks: TaskSuggestion[];
  } | null>(null);

  // Holds the last failed async action so the error banner's Retry can re-run it.
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  // Guards the habitsTasks initial fetch so it only fires once per wizard run.
  const habitsTasksRequested = useRef(false);

  // Resume where a restart interrupted: entities from finished steps already
  // exist, so restarting at "categories" would duplicate them.
  useEffect(() => {
    let cancelled = false;
    void loadWizardProgress().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setStep(stored.step);
        setData(stored.data);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist progress so a restart resumes this step with the created refs.
  // Skips until hydrated — otherwise the initial empty state would overwrite
  // the stored progress before it loads.
  useEffect(() => {
    if (!hydrated) return;
    void saveWizardProgress({ step, data });
  }, [hydrated, step, data]);

  // `overlay: false` = in-step action (e.g. routine regenerate, Task 5): the
  // step stays visible and shows its own busy indicator; the full-screen tips
  // overlay is reserved for between-step transitions.
  const runGuarded = async (
    action: () => Promise<void>,
    { overlay = true }: { overlay?: boolean } = {}
  ) => {
    retryRef.current = action;
    setBusy(true);
    setShowOverlay(overlay);
    setError(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleCategoriesContinue = (names: string[]) => {
    void runGuarded(async () => {
      const res = await fetchOnboardingSuggestions(
        { step: 'CATEGORIES', categoryNames: names },
        t
      );
      if (res.error || !res.success) {
        throw new Error('suggestions failed');
      }
      const refs = await createCategoriesFromSuggestions(
        res.success.categories ?? [],
        t,
        dispatch
      );
      setData((prev) => ({ ...prev, categories: refs }));
      setStep('habitsTasks');
    });
  };

  const habitsTasksContext = () => ({
    categories: data.categories.map((c) => c.name),
  });

  const fetchHabitsTasksSuggestions = async () => {
    const res = await fetchOnboardingSuggestions(
      { step: 'HABITS_TASKS', context: habitsTasksContext() },
      t
    );
    if (res.error || !res.success) {
      throw new Error('suggestions failed');
    }
    setSuggestedHabitsTasks({
      habits: res.success.habits ?? [],
      tasks: res.success.tasks ?? [],
    });
  };

  // One-shot fetch when the habitsTasks step becomes active. Gated on
  // `hydrated`: a resumed run must restore the stored step first, or this
  // would fire with the wrong (empty) context.
  useEffect(() => {
    if (!hydrated || step !== 'habitsTasks' || habitsTasksRequested.current) return;
    habitsTasksRequested.current = true;
    void runGuarded(fetchHabitsTasksSuggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, step]);

  // Persist tutorial completion; the wizard unmounts when the phase leaves "ai".
  const handleStart = () => {
    void runGuarded(async () => {
      await onFinish();
      await clearWizardProgress();
      onClosed();
    });
  };

  // Any exit toward the manual tour abandons the AI flow — a later re-entry
  // (tutorial replay in Settings) should start fresh, not resume. Mobile has
  // no separate manual-fallback target (web routes both to the spotlight
  // tour), so the error-banner fallback exits here too.
  const exitToTour = () => {
    void clearWizardProgress();
    onTakeTour();
    onClosed();
  };

  const handleRetry = () => {
    if (retryRef.current) void runGuarded(retryRef.current);
  };

  if (!visible) return null;

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <Modal visible animationType="slide" onRequestClose={exitToTour}>
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: (insets?.top ?? 0) + 8, paddingBottom: insets?.bottom ?? 0 }}
      >
        {!hydrated ? (
          <View className="flex-1 items-center justify-center" testID="ai-onboarding-hydrating">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <>
            {/* Header: sparkle badge + step dots + step label + tour escape hatch */}
            <View className="flex-row items-center justify-between gap-3 px-4 pb-3 pt-2">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <Sparkles size={16} color={ON_PRIMARY} />
                </View>
                <View className="flex-row items-center gap-1.5">
                  {STEP_ORDER.map((s, index) => (
                    <View
                      key={s}
                      className={`h-1.5 rounded-full ${
                        index === currentIndex
                          ? 'w-6 bg-primary'
                          : 'w-3 bg-description opacity-40'
                      }`}
                    />
                  ))}
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <Text className="text-description text-sm font-medium">
                  {t(STEP_LABEL_KEYS[step])}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('AiOnboardingTakeTour')}
                  onPress={exitToTour}
                  testID="ai-onboarding-take-tour"
                  className="rounded-lg p-1"
                >
                  <Compass size={20} color={theme.secondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="flex-grow justify-center px-4 py-6"
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <ErrorBanner onRetry={handleRetry} onFallback={exitToTour} />
              ) : (
                <>
                  {step === 'categories' ? (
                    <CategoriesStep onContinue={handleCategoriesContinue} loading={busy} />
                  ) : null}
                  {/* habitsTasks / routine / goals / summary steps land in Tasks 4-6;
                      suggestedHabitsTasks + handleStart are already wired for them. */}
                </>
              )}
            </ScrollView>
          </>
        )}

        <BusyOverlay label={t('AiOnboardingLoading')} visible={busy && showOverlay} />
      </View>
    </Modal>
  );
}

interface ErrorBannerProps {
  onRetry: () => void;
  onFallback: () => void;
}

function ErrorBanner({ onRetry, onFallback }: ErrorBannerProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className="w-full items-center rounded-3xl border border-primary/20 bg-background p-6">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <AlertTriangle size={28} color={theme.primary} />
      </View>
      <Text className="text-secondary mb-2 text-center text-xl font-semibold">
        {t('AiOnboardingErrorTitle')}
      </Text>
      <Text className="text-description mb-6 text-center text-base">
        {t('AiOnboardingErrorDescription')}
      </Text>
      <View className="w-full gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          testID="ai-onboarding-retry"
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3"
        >
          <RotateCcw size={16} color={ON_PRIMARY} />
          <Text className="text-base font-semibold" style={{ color: ON_PRIMARY }}>
            {t('AiOnboardingRetry')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onFallback}
          testID="ai-onboarding-take-tour-fallback"
          className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-primary/20 bg-secondary/10 px-5 py-3"
        >
          <Compass size={16} color={theme.secondary} />
          <Text className="text-secondary text-base font-semibold">
            {t('AiOnboardingTakeTour')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
