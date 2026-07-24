import { useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Lightbulb, ListChecks, Repeat, Star, Zap } from 'lucide-react-native';
import type { HabitSuggestion, TaskSuggestion } from '@beyou/types/onboarding/suggestions';
import type { CreatedRef } from '@beyou/state/onboarding/createFromSuggestions';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import Input from '../Input';
import Button from '../Button';
import SuggestionCard from './SuggestionCard';

export type HabitsTasksSelection = {
  habits: HabitSuggestion[];
  tasks: TaskSuggestion[];
  freeTexts: string[];
};

interface HabitsTasksStepProps {
  categories: CreatedRef[];
  initial: { habits: HabitSuggestion[]; tasks: TaskSuggestion[] };
  loading: boolean;
  fetchMore: (newRequest: string) => Promise<{ habits: HabitSuggestion[]; tasks: TaskSuggestion[] }>;
  onContinue: (sel: HabitsTasksSelection) => void;
}

/**
 * Second wizard step (mobile port of the web HabitsTasksStep): AI-suggested
 * habit/task cards in two groups with per-group select-all, a free-text input
 * that fetches more suggestions (appended deduped-by-name and pre-selected),
 * and a continue that reports the selection — zero selection = skip.
 */
export default function HabitsTasksStep({
  categories,
  initial,
  loading,
  fetchMore,
  onContinue,
}: HabitsTasksStepProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const [habits, setHabits] = useState<HabitSuggestion[]>(initial.habits);
  const [tasks, setTasks] = useState<TaskSuggestion[]>(initial.tasks);
  const [selectedHabits, setSelectedHabits] = useState<ReadonlySet<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<ReadonlySet<string>>(new Set());
  const [freeTexts, setFreeTexts] = useState<string[]>([]);
  const [freeInput, setFreeInput] = useState('');
  const [adding, setAdding] = useState(false);

  const toggleIn = (prev: ReadonlySet<string>, name: string): ReadonlySet<string> => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  };

  const toggleAll = (
    items: Array<{ name: string }>,
    selected: ReadonlySet<string>,
    setSelected: (next: ReadonlySet<string>) => void
  ) => {
    const allSelected = items.length > 0 && items.every((item) => selected.has(item.name));
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.name)));
  };

  const addFreeText = async () => {
    const value = freeInput.trim();
    if (!value || adding || loading) return;
    setAdding(true);
    try {
      const res = await fetchMore(value);
      const newHabits = res.habits.filter((h) => !habits.some((e) => e.name === h.name));
      const newTasks = res.tasks.filter((nt) => !tasks.some((e) => e.name === nt.name));
      setHabits((prev) => [...prev, ...newHabits]);
      setTasks((prev) => [...prev, ...newTasks]);
      // Appended items arrive pre-selected — the user explicitly asked for them.
      setSelectedHabits((prev) => new Set([...prev, ...newHabits.map((h) => h.name)]));
      setSelectedTasks((prev) => new Set([...prev, ...newTasks.map((nt) => nt.name)]));
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

  const selectedCount = selectedHabits.size + selectedTasks.size;

  return (
    <View className="w-full gap-6">
      {/* Header + teaching moment: what makes a habit different from a task */}
      <View className="items-center gap-3 px-2">
        <Text className="text-secondary text-center text-2xl font-bold">
          {t('AiOnboardingHabitsTasksTitle')}
        </Text>
        <View className="w-full flex-row items-start gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2.5">
          <View className="pt-0.5">
            <Lightbulb size={16} color={theme.primary} />
          </View>
          <Text className="text-secondary min-w-0 flex-1 text-sm">
            {t('AiOnboardingHabitsTasksHint')}
          </Text>
        </View>
      </View>

      {habits.length > 0 ? (
        <SuggestionGroup
          label={t('AiOnboardingHabitsLabel')}
          icon={<Repeat size={16} color={theme.primary} />}
          selectedCount={selectedHabits.size}
          total={habits.length}
          onToggleAll={() => toggleAll(habits, selectedHabits, setSelectedHabits)}
          toggleAllTestID="ai-onboarding-select-all-habits"
        >
          {habits.map((h) => (
            <SuggestionCard
              key={h.name}
              iconId={h.iconId}
              name={h.name}
              description={h.description}
              selected={selectedHabits.has(h.name)}
              onPress={() => setSelectedHabits((prev) => toggleIn(prev, h.name))}
              testID={`ai-onboarding-suggestion-${h.name}`}
              meta={
                <CardMeta
                  category={displayCategory(h.categoryName)}
                  importance={h.importance}
                  difficulty={h.difficulty}
                />
              }
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {tasks.length > 0 ? (
        <SuggestionGroup
          label={t('AiOnboardingTasksLabel')}
          icon={<ListChecks size={16} color={theme.secondary} />}
          selectedCount={selectedTasks.size}
          total={tasks.length}
          onToggleAll={() => toggleAll(tasks, selectedTasks, setSelectedTasks)}
          toggleAllTestID="ai-onboarding-select-all-tasks"
        >
          {tasks.map((task) => (
            <SuggestionCard
              key={task.name}
              iconId={task.iconId}
              name={task.name}
              description={task.description}
              selected={selectedTasks.has(task.name)}
              onPress={() => setSelectedTasks((prev) => toggleIn(prev, task.name))}
              testID={`ai-onboarding-suggestion-${task.name}`}
              meta={
                <CardMeta
                  category={displayCategory(task.categoryName)}
                  importance={task.importance}
                  difficulty={task.difficulty}
                />
              }
            />
          ))}
        </SuggestionGroup>
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
              selectedCount > 0
                ? `${t('AiOnboardingContinue')} (${selectedCount})`
                : t('AiOnboardingContinue')
            }
            mode="create"
            disabled={loading || adding}
            onPress={() =>
              onContinue({
                habits: habits.filter((h) => selectedHabits.has(h.name)),
                tasks: tasks.filter((task) => selectedTasks.has(task.name)),
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

interface SuggestionGroupProps {
  label: string;
  icon: ReactNode;
  selectedCount: number;
  total: number;
  onToggleAll: () => void;
  toggleAllTestID: string;
  children: ReactNode;
}

function SuggestionGroup({
  label,
  icon,
  selectedCount,
  total,
  onToggleAll,
  toggleAllTestID,
  children,
}: SuggestionGroupProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </View>
          <Text className="text-secondary text-lg font-semibold">{label}</Text>
          <Text className="text-description text-xs font-medium">
            {selectedCount}/{total}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('AiOnboardingSelectAll')}
          onPress={onToggleAll}
          testID={toggleAllTestID}
          className="flex-row items-center gap-1.5 rounded-lg px-2 py-1"
        >
          <CheckCheck size={16} color={theme.primary} />
          <Text className="text-primary text-sm font-semibold">{t('AiOnboardingSelectAll')}</Text>
        </Pressable>
      </View>
      <View className="w-full flex-row flex-wrap gap-3">{children}</View>
    </View>
  );
}

const DOT_LEVELS = [1, 2, 3, 4, 5];

function CardMeta({
  category,
  importance,
  difficulty,
}: {
  category: string;
  importance: number;
  difficulty: number;
}) {
  const { theme } = useBeyouTheme();
  return (
    <View className="items-end gap-1">
      <Text className="text-primary max-w-24 text-[10px] font-semibold uppercase" numberOfLines={1}>
        {category}
      </Text>
      <DotRow icon={<Star size={12} color={theme.primary} />} count={importance} filledClass="bg-primary" />
      <DotRow icon={<Zap size={12} color={theme.secondary} />} count={difficulty} filledClass="bg-secondary" />
    </View>
  );
}

function DotRow({
  icon,
  count,
  filledClass,
}: {
  icon: ReactNode;
  count: number;
  filledClass: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      {icon}
      <View className="flex-row items-center gap-0.5">
        {DOT_LEVELS.map((level) => (
          <View
            key={level}
            className={`h-1.5 w-1.5 rounded-full ${
              level <= count ? filledClass : 'bg-description opacity-30'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
