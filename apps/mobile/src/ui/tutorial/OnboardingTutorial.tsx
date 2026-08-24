import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Compass, Sparkles } from 'lucide-react-native';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { ModalToastHost } from '../BeyouToast';


type Step = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  exampleTitleKey: string;
  itemKeys: string[];
  tipKey: string;
};

const STEPS: Step[] = [
  {
    id: 'categories',
    titleKey: 'TutorialCategoriesTitle',
    descKey: 'TutorialCategoriesDescription',
    icon: 'lucide:folder-open',
    exampleTitleKey: 'TutorialCategoriesExampleTitle',
    itemKeys: ['TutorialCategoriesItem1', 'TutorialCategoriesItem2', 'TutorialCategoriesItem3'],
    tipKey: 'TutorialCategoriesTip',
  },
  {
    id: 'habits',
    titleKey: 'TutorialHabitsTitle',
    descKey: 'TutorialHabitsDescription',
    icon: 'lucide:target',
    exampleTitleKey: 'TutorialHabitsExampleTitle',
    itemKeys: ['TutorialHabitsItem1', 'TutorialHabitsItem2', 'TutorialHabitsItem3'],
    tipKey: 'TutorialHabitsTip',
  },
  {
    id: 'tasks',
    titleKey: 'TutorialTasksTitle',
    descKey: 'TutorialTasksDescription',
    icon: 'lucide:check-square',
    exampleTitleKey: 'TutorialTasksExampleTitle',
    itemKeys: ['TutorialTasksItem1', 'TutorialTasksItem2', 'TutorialTasksItem3'],
    tipKey: 'TutorialTasksTip',
  },
  {
    id: 'routines',
    titleKey: 'TutorialRoutinesTitle',
    descKey: 'TutorialRoutinesDescription',
    icon: 'lucide:calendar',
    exampleTitleKey: 'TutorialRoutinesExampleTitle',
    itemKeys: ['TutorialRoutinesItem1', 'TutorialRoutinesItem2', 'TutorialRoutinesItem3'],
    tipKey: 'TutorialRoutinesTip',
  },
  {
    id: 'goals',
    titleKey: 'TutorialGoalsTitle',
    descKey: 'TutorialGoalsDescription',
    icon: 'lucide:flag',
    exampleTitleKey: 'TutorialGoalsExampleTitle',
    itemKeys: ['TutorialGoalsItem1', 'TutorialGoalsItem2', 'TutorialGoalsItem3'],
    tipKey: 'TutorialGoalsTip',
  },
];

export default function OnboardingTutorial({
  onComplete,
  onSkip,
  onChooseAi,
}: {
  onComplete: () => void;
  onSkip: () => void;
  onChooseAi: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [i, setI] = useState(0);
  const [showFork, setShowFork] = useState(false);
  const step = STEPS[i];
  const isFirst = i === 0;
  const isLast = i === STEPS.length - 1;

  if (showFork) {
    return (
      <Modal visible animationType="fade" transparent onRequestClose={onSkip}>
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-xl rounded-frame border border-border bg-surface p-5">
            <View className="mb-3 flex-row items-center justify-end">
              <Pressable
                onPress={onSkip}
                accessibilityRole="button"
                testID="onboarding-skip"
                hitSlop={8}
                className="flex-row items-center gap-1"
              >
                <Text className="text-text-2 text-sm font-semibold">{t('TutorialSkip')}</Text>
                <Ionicons name="close" size={16} color={theme.description} />
              </Pressable>
            </View>

            <Text className="text-text mb-5 text-center text-2xl font-bold">
              {t('TutorialPathTitle')}
            </Text>

            <View className="gap-4">
              <Pressable
                onPress={onChooseAi}
                accessibilityRole="button"
                accessibilityLabel={t('TutorialPathAiTitle')}
                testID="tutorial-path-ai"
                className="rounded-card border border-border bg-accent/10 p-5 active:opacity-80"
              >
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="h-12 w-12 items-center justify-center rounded-card bg-accent">
                    <Sparkles size={24} color={theme.onAccent} />
                  </View>
                  <View className="flex-row items-center gap-1 rounded-full bg-accent px-3 py-1">
                    <Sparkles size={12} color={theme.onAccent} />
                    <Text className="text-xs font-semibold" style={{ color: theme.onAccent }}>
                      {t('TutorialPathAiBadge')}
                    </Text>
                  </View>
                </View>
                <Text className="text-text mb-1 text-xl font-bold">
                  {t('TutorialPathAiTitle')}
                </Text>
                <Text className="text-text-2 text-sm leading-relaxed">
                  {t('TutorialPathAiDescription')}
                </Text>
                {/* On the card, not after the choice: this is where a person decides
                    whether to hand their answers to an outside model, so the fact that
                    it IS an outside model has to be readable before the tap. */}
                <Text className="text-text-3 mt-3 text-[12px] leading-snug">
                  {t('AiOnboardingPrivacyNotice')}
                </Text>
              </Pressable>

              <Pressable
                onPress={onComplete}
                accessibilityRole="button"
                accessibilityLabel={t('TutorialPathManualTitle')}
                testID="tutorial-path-manual"
                className="rounded-card border border-border bg-surface p-5 active:opacity-80"
              >
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-card bg-accent/15">
                  <Compass size={24} color={theme.secondary} />
                </View>
                <Text className="text-text mb-1 text-xl font-bold">
                  {t('TutorialPathManualTitle')}
                </Text>
                <Text className="text-text-2 text-sm leading-relaxed">
                  {t('TutorialPathManualDescription')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
        <ModalToastHost />
      </Modal>
    );
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onSkip}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="w-full max-w-xl rounded-frame border border-border bg-surface p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-accent text-sm font-semibold">
              {t('TutorialStepOf', { current: i + 1, total: STEPS.length })}
            </Text>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              testID="onboarding-skip"
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Text className="text-text-2 text-sm font-semibold">{t('TutorialSkip')}</Text>
              <Ionicons name="close" size={16} color={theme.description} />
            </Pressable>
          </View>

          {/* progress dots */}
          <View className="mb-4 flex-row justify-center gap-2">
            {STEPS.map((s, idx) => (
              <View
                key={s.id}
                className={`h-2 w-2 rounded-full ${
                  idx === i ? 'bg-accent' : idx < i ? 'bg-accent/50' : 'bg-text-3/30'
                }`}
              />
            ))}
          </View>

          <ScrollView key={step.id} className="max-h-[60vh]" contentContainerClassName="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <BeyouIcon id={step.icon} size={26} />
              </View>
              <Text className="text-text flex-1 text-2xl font-bold">{t(step.titleKey)}</Text>
            </View>
            <Text className="text-text-2 text-base leading-relaxed">{t(step.descKey)}</Text>

            <View className="rounded-card bg-accent/10 p-4">
              <Text className="text-text mb-3 font-semibold">{t(step.exampleTitleKey)}</Text>
              <View className="gap-2">
                {step.itemKeys.map((k) => (
                  <View key={k} className="flex-row items-center gap-2 rounded-control bg-surface/60 p-2">
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    <Text className="text-text text-sm">{t(k)}</Text>
                  </View>
                ))}
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
                <Text className="text-text-2 text-xs">{t('TutorialCompleteForXp')}</Text>
                <Text className="text-accent text-sm font-bold">+{(i + 1) * 50} XP</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2 rounded-card border border-border p-3">
              <Ionicons name="sparkles" size={16} color={theme.primary} />
              <View className="flex-1">
                <Text className="text-text text-sm font-semibold">{t('TutorialProTip')}</Text>
                <Text className="text-text-2 text-sm">{t(step.tipKey)}</Text>
              </View>
            </View>
          </ScrollView>

          <View className="mt-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setI((p) => Math.max(0, p - 1))}
              disabled={isFirst}
              accessibilityRole="button"
              testID="onboarding-prev"
              className="px-3 py-2"
            >
              {/* Same weight on every card — only the color signals disabled. */}
              <Text className={`font-semibold ${isFirst ? 'text-text-2/40' : 'text-text'}`}>
                {t('TutorialPrevious')}
              </Text>
            </Pressable>
            <Button
              text={isLast ? t('TutorialGetStarted') : t('TutorialNext')}
              mode="create"
              size="small"
              onPress={() => (isLast ? setShowFork(true) : setI((p) => p + 1))}
              testID="onboarding-next"
            />
          </View>
        </View>
      </View>
      {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
      <ModalToastHost />
    </Modal>
  );
}
