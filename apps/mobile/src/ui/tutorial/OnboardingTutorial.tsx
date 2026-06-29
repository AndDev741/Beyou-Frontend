import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import { useBeyouTheme } from '../../theme/ThemeProvider';

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
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isFirst = i === 0;
  const isLast = i === STEPS.length - 1;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onSkip}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="w-full max-w-xl rounded-3xl border border-primary/20 bg-background p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-primary text-sm font-semibold">
              {t('TutorialStepOf', { current: i + 1, total: STEPS.length })}
            </Text>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              testID="onboarding-skip"
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Text className="text-description text-sm font-semibold">{t('TutorialSkip')}</Text>
              <Ionicons name="close" size={16} color={theme.description} />
            </Pressable>
          </View>

          {/* progress dots */}
          <View className="mb-4 flex-row justify-center gap-2">
            {STEPS.map((s, idx) => (
              <View
                key={s.id}
                className={`h-2 w-2 rounded-full ${
                  idx === i ? 'bg-primary' : idx < i ? 'bg-primary/50' : 'bg-description/30'
                }`}
              />
            ))}
          </View>

          <ScrollView className="max-h-[60vh]" contentContainerClassName="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <BeyouIcon id={step.icon} size={26} />
              </View>
              <Text className="text-secondary flex-1 text-2xl font-bold">{t(step.titleKey)}</Text>
            </View>
            <Text className="text-description text-base leading-relaxed">{t(step.descKey)}</Text>

            <View className="rounded-2xl bg-primary/10 p-4">
              <Text className="text-secondary mb-3 font-semibold">{t(step.exampleTitleKey)}</Text>
              <View className="gap-2">
                {step.itemKeys.map((k) => (
                  <View key={k} className="flex-row items-center gap-2 rounded-lg bg-background/60 p-2">
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    <Text className="text-secondary text-sm">{t(k)}</Text>
                  </View>
                ))}
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-primary/15 pt-3">
                <Text className="text-description text-xs">{t('TutorialCompleteForXp')}</Text>
                <Text className="text-primary text-sm font-bold">+{(i + 1) * 50} XP</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2 rounded-xl border border-primary/20 p-3">
              <Ionicons name="sparkles" size={16} color={theme.primary} />
              <View className="flex-1">
                <Text className="text-secondary text-sm font-semibold">{t('TutorialProTip')}</Text>
                <Text className="text-description text-sm">{t(step.tipKey)}</Text>
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
              <Text className={isFirst ? 'text-description/40' : 'text-secondary font-semibold'}>
                {t('TutorialPrevious')}
              </Text>
            </Pressable>
            <Button
              text={isLast ? t('TutorialGetStarted') : t('TutorialNext')}
              mode="create"
              size="small"
              onPress={() => (isLast ? onComplete() : setI((p) => p + 1))}
              testID="onboarding-next"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
