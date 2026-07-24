import { useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Target } from 'lucide-react-native';
import type { GoalSuggestion } from '@beyou/types/onboarding/suggestions';
import type { CreatedRef } from '@beyou/state/onboarding/createFromSuggestions';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import Input from '../Input';
import Button from '../Button';
import SuggestionCard from './SuggestionCard';

export type GoalsSelection = {
  goals: GoalSuggestion[];
  freeTexts: string[];
};

interface GoalsStepProps {
  categories: CreatedRef[];
  initial: GoalSuggestion[];
  loading: boolean;
  fetchMore: (newRequest: string) => Promise<GoalSuggestion[]>;
  onContinue: (sel: GoalsSelection) => void;
}

const TERM_LABEL_KEYS: Record<GoalSuggestion['term'], string> = {
  SHORT_TERM: 'Short Term',
  MEDIUM_TERM: 'Medium Term',
  LONG_TERM: 'Long Term',
};

/**
 * Fourth wizard step (mobile port of the web GoalsStep): AI-suggested goal
 * cards in a single group with select-all, a free-text input that fetches
 * more suggestions (appended deduped-by-name and pre-selected), and a
 * continue that reports the selection — zero selection = skip.
 */
export default function GoalsStep({
  categories,
  initial,
  loading,
  fetchMore,
  onContinue,
}: GoalsStepProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const [goals, setGoals] = useState<GoalSuggestion[]>(initial);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [freeTexts, setFreeTexts] = useState<string[]>([]);
  const [freeInput, setFreeInput] = useState('');
  const [adding, setAdding] = useState(false);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    const allSelected = goals.length > 0 && goals.every((g) => selected.has(g.name));
    setSelected(allSelected ? new Set() : new Set(goals.map((g) => g.name)));
  };

  const addFreeText = async () => {
    const value = freeInput.trim();
    if (!value || adding || loading) return;
    setAdding(true);
    try {
      const fetched = await fetchMore(value);
      const fresh = fetched.filter((g) => !goals.some((e) => e.name === g.name));
      setGoals((prev) => [...prev, ...fresh]);
      // Appended items arrive pre-selected — the user explicitly asked for them.
      setSelected((prev) => new Set([...prev, ...fresh.map((g) => g.name)]));
      setFreeTexts((prev) => [...prev, value]);
      setFreeInput('');
    } catch {
      // The wizard surfaces the shared error banner; keep the input for a retry.
    } finally {
      setAdding(false);
    }
  };

  const displayCategory = (categoryName: string) =>
    categories.find((c) => c.name.toLowerCase() === categoryName?.toLowerCase())?.name ??
    categoryName;

  return (
    <View className="w-full gap-6">
      {/* Header */}
      <View className="items-center gap-2 px-2">
        <Text className="text-secondary text-center text-2xl font-bold">
          {t('AiOnboardingGoalsTitle')}
        </Text>
        <Text className="text-description text-center text-sm">{t('AiOnboardingGoalsHint')}</Text>
      </View>

      {goals.length > 0 ? (
        <View className="w-full gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Target size={16} color={theme.primary} />
              </View>
              <Text className="text-secondary text-lg font-semibold">
                {t('AiOnboardingSummaryGoals')}
              </Text>
              <Text className="text-description text-xs font-medium">
                {selected.size}/{goals.length}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('AiOnboardingSelectAll')}
              onPress={toggleAll}
              testID="ai-onboarding-select-all-goals"
              className="flex-row items-center gap-1.5 rounded-lg px-2 py-1"
            >
              <CheckCheck size={16} color={theme.primary} />
              <Text className="text-primary text-sm font-semibold">
                {t('AiOnboardingSelectAll')}
              </Text>
            </Pressable>
          </View>
          <View className="w-full flex-row flex-wrap gap-3">
            {goals.map((goal) => (
              <SuggestionCard
                key={goal.name}
                iconId={goal.iconId}
                name={goal.name}
                description={goal.description}
                selected={selected.has(goal.name)}
                onPress={() => toggle(goal.name)}
                testID={`ai-onboarding-suggestion-${goal.name}`}
                meta={
                  <GoalMeta
                    category={displayCategory(goal.categoryName)}
                    targetValue={goal.targetValue}
                    unit={goal.unit}
                    termLabel={t(TERM_LABEL_KEYS[goal.term])}
                  />
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Free input + continue */}
      <View className="w-full gap-4">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1">
            <Input
              value={freeInput}
              onChangeText={setFreeInput}
              placeholder={t('AiOnboardingFreeInputPlaceholder')}
              accessibilityLabel={t('AiOnboardingFreeInputPlaceholder')}
              testID="ai-onboarding-free-input"
              onSubmitEditing={() => void addFreeText()}
              returnKeyType="done"
            />
          </View>
          <Button
            text={t('AiOnboardingAdd')}
            mode="default"
            size="small"
            submitting={adding}
            onPress={() => void addFreeText()}
            testID="ai-onboarding-free-add"
          />
        </View>

        <View className="items-center">
          <Button
            text={
              selected.size > 0
                ? `${t('AiOnboardingContinue')} (${selected.size})`
                : t('AiOnboardingContinue')
            }
            mode="create"
            disabled={loading || adding}
            onPress={() =>
              onContinue({
                goals: goals.filter((g) => selected.has(g.name)),
                freeTexts,
              })
            }
            testID="ai-onboarding-continue"
          />
        </View>
      </View>
    </View>
  );
}

function GoalMeta({
  category,
  targetValue,
  unit,
  termLabel,
}: {
  category: string;
  targetValue: number;
  unit: string;
  termLabel: string;
}) {
  const { theme } = useBeyouTheme();
  return (
    <View className="items-end gap-1">
      <Text className="text-primary max-w-24 text-[10px] font-semibold uppercase" numberOfLines={1}>
        {category}
      </Text>
      <View className="flex-row items-center gap-1">
        <Target size={12} color={theme.primary} />
        <Text className="text-secondary text-xs font-semibold">
          {targetValue} {unit}
        </Text>
      </View>
      <View className="rounded-full bg-secondary/10 px-2 py-0.5">
        <Text className="text-secondary text-[10px] font-semibold">{termLabel}</Text>
      </View>
    </View>
  );
}
