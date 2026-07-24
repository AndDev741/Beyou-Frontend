import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ListChecks,
  Repeat,
  Wand2,
  X,
} from 'lucide-react-native';
import type {
  ItemPlacement,
  RoutineSuggestion,
  SectionSuggestion,
} from '@beyou/types/onboarding/suggestions';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { DAYS } from '../routines/ScheduleIndicator';
import TimeField from '../routines/TimeField';
import BottomSheet from '../BottomSheet';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import Input from '../Input';

const ON_PRIMARY = '#FFFFFF';

type ItemKind = 'habits' | 'tasks';

interface RoutineStepProps {
  suggestion: RoutineSuggestion;
  onAccept: (edited: RoutineSuggestion, days: string[]) => void;
  onRegenerate: (feedback: string) => void;
  loading: boolean;
}

/** Display sections as a chronological timeline regardless of the AI's ordering. */
const sortSections = (sections: SectionSuggestion[]): SectionSuggestion[] =>
  [...sections].sort((a, b) => a.startTime.localeCompare(b.startTime));

const withItems = (
  section: SectionSuggestion,
  kind: ItemKind,
  items: ItemPlacement[]
): SectionSuggestion =>
  kind === 'habits' ? { ...section, habits: items } : { ...section, tasks: items };

/** One display row: which array the item lives in plus its index there. */
type SectionEntry = { kind: ItemKind; item: ItemPlacement; index: number };

/** Habits and tasks merged into ONE chronological list — the real routine
 *  orders items by time, so the draft must too (and reordering means
 *  exchanging time slots, not array positions). */
const sectionEntries = (section: SectionSuggestion): SectionEntry[] =>
  [
    ...section.habits.map((item, index) => ({ kind: 'habits' as const, item, index })),
    ...section.tasks.map((item, index) => ({ kind: 'tasks' as const, item, index })),
  ].sort((a, b) => a.item.startTime.localeCompare(b.item.startTime));

const toMinutes = (hhmm: string): number => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

const toHHMM = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

/** Puts `second` before `first` in time, keeping each item's duration and the
 *  original starting point. Malformed times fall back to a plain window swap. */
const swapChronology = (
  first: ItemPlacement,
  second: ItemPlacement
): { newFirst: ItemPlacement; newSecond: ItemPlacement } => {
  const start = toMinutes(first.startTime);
  const durFirst = toMinutes(first.endTime) - toMinutes(first.startTime);
  const durSecond = toMinutes(second.endTime) - toMinutes(second.startTime);
  if ([start, durFirst, durSecond].some(Number.isNaN)) {
    return {
      newFirst: { ...first, startTime: second.startTime, endTime: second.endTime },
      newSecond: { ...second, startTime: first.startTime, endTime: first.endTime },
    };
  }
  const newSecond = { ...second, startTime: toHHMM(start), endTime: toHHMM(start + durSecond) };
  const newFirst = {
    ...first,
    startTime: newSecond.endTime,
    endTime: toHHMM(start + durSecond + durFirst),
  };
  return { newFirst, newSecond };
};

/** Which item the move-to-section BottomSheet is open for. */
type MoveTarget = { kind: ItemKind; sectionIndex: number; itemIndex: number };

/**
 * Third wizard step (mobile port of the web RoutineStep): the AI's routine
 * draft as a chronological section timeline with editable item times,
 * reorder-by-time-slot-swap, move-to-section, remove, weekday schedule pills
 * and a feedback loop that regenerates the draft in place.
 */
export default function RoutineStep({
  suggestion,
  onAccept,
  onRegenerate,
  loading,
}: RoutineStepProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const [draft, setDraft] = useState<RoutineSuggestion>(() => ({
    ...suggestion,
    sections: sortSections(suggestion.sections),
  }));
  const [selectedDays, setSelectedDays] = useState<ReadonlySet<string>>(
    () => new Set(suggestion.scheduleDays)
  );
  const [feedback, setFeedback] = useState('');
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);

  // A regenerated suggestion replaces any local edits — the user asked for a new draft.
  useEffect(() => {
    setDraft({ ...suggestion, sections: sortSections(suggestion.sections) });
    setSelectedDays(new Set(suggestion.scheduleDays));
    // A new draft means the regenerate request succeeded — clear the ask.
    setFeedback('');
  }, [suggestion]);

  const moveItem = (kind: ItemKind, fromSection: number, itemIndex: number, toSection: number) => {
    if (toSection === fromSection) return;
    setDraft((prev) => {
      const item = prev.sections[fromSection][kind][itemIndex];
      if (!item) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index === fromSection) {
            return withItems(section, kind, section[kind].filter((_, i) => i !== itemIndex));
          }
          if (index === toSection) {
            // The item keeps its own times — only its section changes.
            return withItems(section, kind, [...section[kind], item]);
          }
          return section;
        }),
      };
    });
  };

  /** Swap this item's time slot with its chronological neighbor in the section. */
  const reorderItem = (
    kind: ItemKind,
    sectionIndex: number,
    itemIndex: number,
    direction: -1 | 1
  ) => {
    setDraft((prev) => {
      const section = prev.sections[sectionIndex];
      if (!section) return prev;
      const entries = sectionEntries(section);
      const pos = entries.findIndex((e) => e.kind === kind && e.index === itemIndex);
      const neighborPos = pos + direction;
      if (pos === -1 || neighborPos < 0 || neighborPos >= entries.length) return prev;
      const earlier = entries[Math.min(pos, neighborPos)];
      const later = entries[Math.max(pos, neighborPos)];
      const { newFirst, newSecond } = swapChronology(earlier.item, later.item);
      const updateEntry = (items: ItemPlacement[], entry: SectionEntry, next: ItemPlacement) =>
        items.map((item, i) => (i === entry.index ? next : item));
      let updated = section;
      updated = withItems(
        updated,
        earlier.kind,
        updateEntry(updated[earlier.kind], earlier, newFirst)
      );
      updated = withItems(updated, later.kind, updateEntry(updated[later.kind], later, newSecond));
      return {
        ...prev,
        sections: prev.sections.map((s, i) => (i === sectionIndex ? updated : s)),
      };
    });
  };

  /** Edit an item's start/end time in place. Empty values (mid-edit) are ignored. */
  const setItemTime = (
    kind: ItemKind,
    sectionIndex: number,
    itemIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    if (!value) return;
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? withItems(
              section,
              kind,
              section[kind].map((item, j) => (j === itemIndex ? { ...item, [field]: value } : item))
            )
          : section
      ),
    }));
  };

  const removeItem = (kind: ItemKind, sectionIndex: number, itemIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? withItems(section, kind, section[kind].filter((_, i) => i !== itemIndex))
          : section
      ),
    }));
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <View className="w-full gap-6">
      {/* Header: title, routine name and the "you can edit this" hint */}
      <View className="items-center gap-3 px-2">
        <Text className="text-secondary text-center text-2xl font-bold">
          {t('AiOnboardingRoutineTitle')}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <BeyouIcon id={draft.iconId} size={18} color={theme.primary} showFallback />
          </View>
          <Text className="text-secondary text-lg font-semibold" numberOfLines={1}>
            {draft.name}
          </Text>
        </View>
        <View className="w-full flex-row items-start gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2.5">
          <View className="pt-0.5">
            <Lightbulb size={16} color={theme.primary} />
          </View>
          <Text className="text-secondary min-w-0 flex-1 text-sm">
            {t('AiOnboardingRoutineHint')}
          </Text>
        </View>
      </View>

      {/* Chronological section cards */}
      <View className="w-full gap-4">
        {draft.sections.map((section, sectionIndex) => (
          <View
            key={`${section.name}-${section.startTime}`}
            className="rounded-3xl border border-primary/20 bg-secondary/5 p-4"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <BeyouIcon id={section.iconId} size={18} color={theme.primary} showFallback />
              </View>
              <Text className="text-secondary min-w-0 flex-1 font-semibold" numberOfLines={1}>
                {section.name}
              </Text>
              <Text className="text-primary text-sm font-semibold">
                {section.startTime}
                <Text className="text-description font-normal"> – </Text>
                {section.endTime}
              </Text>
            </View>

            {sectionEntries(section).length > 0 ? (
              <View className="mt-3 gap-2">
                {sectionEntries(section).map((entry, pos, entries) => (
                  <ItemCard
                    key={`${entry.kind}-${entry.item.name}-${entry.index}`}
                    kind={entry.kind}
                    item={entry.item}
                    sectionIndex={sectionIndex}
                    itemIndex={entry.index}
                    sectionName={section.name}
                    canMoveEarlier={pos > 0}
                    canMoveLater={pos < entries.length - 1}
                    onReorder={reorderItem}
                    onTimeChange={setItemTime}
                    onOpenMove={setMoveTarget}
                    onRemove={removeItem}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Weekday schedule pills */}
      <View className="items-center gap-3">
        <View className="flex-row items-center gap-1.5">
          <CalendarDays size={16} color={theme.primary} />
          <Text className="text-description text-sm font-semibold">
            {t('AiOnboardingScheduleDays')}
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-center gap-1.5">
          {DAYS.map((day) => {
            const active = selectedDays.has(day.wire);
            return (
              <Pressable
                key={day.wire}
                accessibilityRole="button"
                accessibilityLabel={day.wire}
                accessibilityState={{ selected: active }}
                onPress={() => toggleDay(day.wire)}
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  active ? 'bg-primary' : 'bg-secondary/10'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${active ? '' : 'text-secondary'}`}
                  style={active ? { color: ON_PRIMARY } : undefined}
                >
                  {t(day.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Feedback + actions */}
      <View className="w-full gap-4">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1">
            <Input
              value={feedback}
              onChangeText={setFeedback}
              placeholder={t('AiOnboardingRoutineFeedbackPlaceholder')}
              accessibilityLabel={t('AiOnboardingRoutineFeedbackPlaceholder')}
              testID="ai-onboarding-feedback"
              onSubmitEditing={() => {
                if (!loading) onRegenerate(feedback.trim());
              }}
              returnKeyType="done"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              loading ? 'AiOnboardingLoading' : 'AiOnboardingRoutineRegenerate'
            )}
            disabled={loading}
            onPress={() => onRegenerate(feedback.trim())}
            testID="ai-onboarding-regenerate"
            className={`h-[48px] flex-row items-center justify-center gap-1.5 rounded-xl bg-secondary/10 px-4 ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Wand2 size={16} color={theme.secondary} />
            )}
            <Text className="text-secondary text-sm font-semibold">
              {t(loading ? 'AiOnboardingLoading' : 'AiOnboardingRoutineRegenerate')}
            </Text>
          </Pressable>
        </View>

        <View className="items-center">
          <Button
            text={t('AiOnboardingRoutineAccept')}
            mode="create"
            disabled={loading}
            onPress={() =>
              onAccept(
                draft,
                DAYS.filter((day) => selectedDays.has(day.wire)).map((day) => day.wire)
              )
            }
            testID="ai-onboarding-routine-accept"
          />
        </View>
      </View>

      {/* Move-to-section picker */}
      <BottomSheet visible={moveTarget !== null} onClose={() => setMoveTarget(null)}>
        <Text className="text-secondary mb-3 text-lg font-semibold">
          {t('AiOnboardingMoveToSection')}
        </Text>
        <View className="gap-1 pb-2">
          {draft.sections.map((section, index) => {
            const current = moveTarget?.sectionIndex === index;
            return (
              <Pressable
                key={`${section.name}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                testID={`ai-onboarding-section-option-${index}`}
                onPress={() => {
                  if (moveTarget) {
                    moveItem(moveTarget.kind, moveTarget.sectionIndex, moveTarget.itemIndex, index);
                  }
                  setMoveTarget(null);
                }}
                className={`flex-row items-center gap-2.5 rounded-xl px-3 py-3 ${
                  current ? 'bg-primary/10' : ''
                }`}
              >
                <BeyouIcon id={section.iconId} size={16} color={theme.primary} showFallback />
                <Text className="text-secondary min-w-0 flex-1 font-medium" numberOfLines={1}>
                  {section.name}
                </Text>
                <Text className="text-description text-xs">
                  {section.startTime} – {section.endTime}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

interface ItemCardProps {
  kind: ItemKind;
  item: ItemPlacement;
  sectionIndex: number;
  itemIndex: number;
  sectionName: string;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onReorder: (kind: ItemKind, sectionIndex: number, itemIndex: number, direction: -1 | 1) => void;
  onTimeChange: (
    kind: ItemKind,
    sectionIndex: number,
    itemIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => void;
  onOpenMove: (target: MoveTarget) => void;
  onRemove: (kind: ItemKind, sectionIndex: number, itemIndex: number) => void;
}

/** One habit/task placement card, three tiers: kind glyph + name + remove;
 *  start–end TimeFields; reorder chevrons + move-to-section opener. */
function ItemCard({
  kind,
  item,
  sectionIndex,
  itemIndex,
  sectionName,
  canMoveEarlier,
  canMoveLater,
  onReorder,
  onTimeChange,
  onOpenMove,
  onRemove,
}: ItemCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const Glyph = kind === 'habits' ? Repeat : ListChecks;
  const idSuffix = `${kind}-${sectionIndex}-${itemIndex}`;

  return (
    <View className="gap-2 rounded-xl bg-background/60 px-2.5 py-2">
      {/* Tier 1: kind glyph + name + remove */}
      <View className="flex-row items-center gap-2">
        <View
          className={`h-7 w-7 items-center justify-center rounded-lg ${
            kind === 'habits' ? 'bg-primary/10' : 'bg-secondary/10'
          }`}
        >
          <Glyph size={14} color={kind === 'habits' ? theme.primary : theme.secondary} />
        </View>
        <Text className="text-secondary min-w-0 flex-1 text-sm font-medium" numberOfLines={1}>
          {item.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('AiOnboardingRemoveItem')}
          onPress={() => onRemove(kind, sectionIndex, itemIndex)}
          testID={`ai-onboarding-item-remove-${idSuffix}`}
          className="h-7 w-7 items-center justify-center rounded-lg"
        >
          <X size={16} color={theme.description} />
        </Pressable>
      </View>

      {/* Tier 2: start – end times */}
      <View className="flex-row items-center justify-center gap-1.5">
        <TimeField
          value={item.startTime}
          onChange={(hhmm) => onTimeChange(kind, sectionIndex, itemIndex, 'startTime', hhmm)}
          testID={`ai-onboarding-start-${idSuffix}`}
        />
        <Text className="text-description text-xs">–</Text>
        <TimeField
          value={item.endTime}
          onChange={(hhmm) => onTimeChange(kind, sectionIndex, itemIndex, 'endTime', hhmm)}
          testID={`ai-onboarding-end-${idSuffix}`}
        />
      </View>

      {/* Tier 3: reorder chevrons + section mover */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('AiOnboardingMoveEarlier')}
            disabled={!canMoveEarlier}
            onPress={() => onReorder(kind, sectionIndex, itemIndex, -1)}
            className={`h-7 w-7 items-center justify-center rounded-lg ${
              canMoveEarlier ? '' : 'opacity-30'
            }`}
          >
            <ChevronUp size={16} color={theme.description} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('AiOnboardingMoveLater')}
            disabled={!canMoveLater}
            onPress={() => onReorder(kind, sectionIndex, itemIndex, 1)}
            className={`h-7 w-7 items-center justify-center rounded-lg ${
              canMoveLater ? '' : 'opacity-30'
            }`}
          >
            <ChevronDown size={16} color={theme.description} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('AiOnboardingMoveToSection')}
          onPress={() => onOpenMove({ kind, sectionIndex, itemIndex })}
          testID={`ai-onboarding-move-section-${idSuffix}`}
          className="max-w-[45%] rounded-lg border border-primary/20 px-2 py-1"
        >
          <Text className="text-secondary text-xs" numberOfLines={1}>
            {sectionName}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
