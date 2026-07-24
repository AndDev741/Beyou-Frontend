import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  FolderOpen,
  ListChecks,
  PartyPopper,
  Repeat,
  Target,
} from 'lucide-react-native';
import type { CreatedRef } from '@beyou/state/onboarding/createFromSuggestions';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import Button from '../Button';
import type { WizardData } from './AiOnboardingWizard';

interface SummaryStepProps {
  data: WizardData;
  onStart: () => void;
  onTour: () => void;
}

/** Final wizard screen (mobile port of the web SummaryStep): celebrates
 *  everything the AI setup created and hands off to the dashboard (onStart)
 *  or the hands-on spotlight tour (onTour). */
export default function SummaryStep({ data, onStart, onTour }: SummaryStepProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const groups: Array<{ labelKey: string; icon: ReactNode; items: CreatedRef[] }> = [
    {
      labelKey: 'AiOnboardingSummaryCategories',
      icon: <FolderOpen size={16} color={theme.primary} />,
      items: data.categories,
    },
    {
      labelKey: 'AiOnboardingSummaryHabits',
      icon: <Repeat size={16} color={theme.primary} />,
      items: data.habits,
    },
    {
      labelKey: 'AiOnboardingSummaryTasks',
      icon: <ListChecks size={16} color={theme.primary} />,
      items: data.tasks,
    },
    {
      labelKey: 'AiOnboardingSummaryRoutine',
      icon: <CalendarClock size={16} color={theme.primary} />,
      items: data.routineName ? [{ id: 'routine', name: data.routineName }] : [],
    },
    {
      labelKey: 'AiOnboardingSummaryGoals',
      icon: <Target size={16} color={theme.primary} />,
      items: data.goals,
    },
  ].filter((group) => group.items.length > 0);

  return (
    <View className="w-full items-center gap-6">
      {/* Celebration badge */}
      <View className="h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
        <PartyPopper size={40} color={theme.primary} />
      </View>

      {/* Celebratory header */}
      <View className="items-center gap-2 px-2">
        <Text className="text-primary text-center text-3xl font-bold leading-tight">
          {t('AiOnboardingSummaryTitle')}
        </Text>
        <Text className="text-description text-center text-base">
          {t('AiOnboardingSummaryDescription')}
        </Text>
      </View>

      {/* Everything created, grouped (empty groups omitted) */}
      <View className="w-full gap-5 rounded-3xl border border-primary/20 bg-secondary/5 p-5">
        {groups.map((group) => (
          <View key={group.labelKey} className="gap-2">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                {group.icon}
              </View>
              <Text className="text-description text-sm font-semibold uppercase">
                {t(group.labelKey)}
              </Text>
              <Text className="text-description text-xs font-medium">{group.items.length}</Text>
            </View>
            <View className="flex-row flex-wrap gap-2 pl-9">
              {group.items.map((item) => (
                <View
                  key={item.id}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1"
                >
                  <Text className="text-secondary text-sm font-medium">{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View className="w-full items-center gap-3">
        <Button
          text={t('AiOnboardingStart')}
          mode="create"
          onPress={onStart}
          testID="ai-onboarding-start"
        />
        <Button
          text={t('AiOnboardingTour')}
          mode="default"
          onPress={onTour}
          testID="ai-onboarding-tour"
        />
      </View>
    </View>
  );
}
