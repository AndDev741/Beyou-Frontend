import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useStore } from 'react-redux';
import { Check, Minus, Plus, Target, X } from 'lucide-react-native';
import { createStudyCycle, getStudyCycle, planStudyCycle, updateStudyCycle } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  WEEKDAYS, enterStudyCycle, formatStudyMinutes, orderedDays, refreshStudyCycles, subjectLabel, subjectOptions, weekMinutes,
  type SubjectOption,
} from '@beyou/state';
import type { BlockMode, CycleDay, CycleTopic, PlanResponse, PlanTopic } from '@beyou/types/notebook/studyCycle';
import BottomSheet from '../src/ui/BottomSheet';
import Button from '../src/ui/Button';
import Card from '../src/ui/Card';
import IconButton from '../src/ui/IconButton';
import Input from '../src/ui/Input';
import SegmentedControl from '../src/ui/SegmentedControl';
import TimeField from '../src/ui/routines/TimeField';
import { useKeyboardLift } from '../src/ui/keyboard';
import { MAX_BLOCK_CHOICES, PLAN_DEBOUNCE_MS, weekdayLabel } from '../src/notebook/cycles/cycleText';
import { useCyclesInFull, useNotebookTrees } from '../src/notebook/cycles/useCycleData';
import RootPrefix from '../src/notebook/cycles/RootPrefix';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../src/store';

const MAX_TOPICS = 30;
const DAY_STEP = 30;
const DAY_MAX = 720;

/** A subject of the cycle being built. `rootTitle` is null for a root topic. */
type DraftTopic = CycleTopic & { title: string; rootTitle: string | null };

/** A new cycle's week: an hour on weekdays, the weekend free. The person changes it here. */
const DEFAULT_DAYS: CycleDay[] = WEEKDAYS.map((weekday) => ({
  weekday,
  minutes: weekday === 'SATURDAY' || weekday === 'SUNDAY' ? 0 : 60,
  startTime: null,
}));

/**
 * Building or editing a study cycle, with the calculator: the week (minutes per day, an optional
 * start time), the default goal of new blocks, the longest block, and the subjects (a notebook
 * topic or any page inside one) with how much each matters and how well it is known. The
 * server's planner (`POST /cycles/plan`, the same arithmetic it saves with) turns that into each
 * subject's minutes and the order of the blocks, shown live: asked again 300 ms after the last
 * change, an older answer that arrives late is dropped.
 *
 * Saving a change to an existing cycle re-plans it on the server, which keeps each block's
 * progress by topic.
 */
export default function NotebookCycleEditScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { lift, onLayout } = useKeyboardLift();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { roots: notebookTopics, trees } = useNotebookTrees();
  const { cycles, load: loadCycles } = useCyclesInFull();

  const [hydrated, setHydrated] = useState(!editId);
  const [name, setName] = useState('');
  const [days, setDays] = useState<CycleDay[]>(DEFAULT_DAYS);
  const [defaultMode, setDefaultMode] = useState<BlockMode>('GOAL');
  const [maxBlock, setMaxBlock] = useState(90);
  const [topics, setTopics] = useState<DraftTopic[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const planSeq = useRef(0);

  useEffect(() => {
    void loadCycles();
  }, [loadCycles]);

  // Editing: the cycle as saved, read once into the form.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    void getStudyCycle(editId, t).then((response) => {
      if (cancelled) return;
      if (!response.success) {
        notify.error(getFriendlyErrorMessage(t, response.error));
        return;
      }
      const cycle = response.success;
      setName(cycle.name);
      setDays(orderedDays(cycle.days));
      setDefaultMode(cycle.defaultMode);
      setMaxBlock(cycle.maxBlockMinutes);
      setTopics(
        cycle.topics.map((topic) => ({
          topicId: topic.topicId,
          importance: topic.importance,
          mastery: topic.mastery,
          minutesOverride: topic.minutesOverride,
          title: topic.topic.title,
          rootTitle: topic.topic.rootTitle ?? null,
        })),
      );
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editId, t]);

  const planRequest = useMemo(
    () => ({
      days,
      maxBlockMinutes: maxBlock,
      topics: topics.map(({ topicId, importance, mastery, minutesOverride }) => ({ topicId, importance, mastery, minutesOverride })),
    }),
    [days, maxBlock, topics],
  );
  const planKey = JSON.stringify(planRequest);

  // The calculator: the server's planner, asked once the person stops changing things. Every
  // request takes a number; an answer whose number is no longer the last one is ignored.
  useEffect(() => {
    if (!hydrated) return;
    const seq = ++planSeq.current;
    if (planRequest.topics.length === 0) {
      setPlan(null);
      return;
    }
    const timer = setTimeout(() => {
      void planStudyCycle(planRequest, t).then((response) => {
        if (seq !== planSeq.current) return;
        if (response.success) setPlan(response.success);
      });
    }, PLAN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [planKey, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Subjects another active cycle holds. A page belongs to one active cycle at most, and so does
   * everything above and below it, which the picker works out from these.
   */
  const takenBy = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cycle of cycles) {
      if (cycle.id === editId) continue;
      for (const topic of cycle.topics) map[topic.topicId] = cycle.name;
    }
    return map;
  }, [cycles, editId]);

  // Every root and the pages under it, depth first, each with the reason it cannot join.
  const options = useMemo(
    () => (notebookTopics ? subjectOptions({ roots: notebookTopics, trees, picked: topics.map((draft) => draft.topicId), taken: takenBy }) : null),
    [notebookTopics, trees, topics, takenBy],
  );

  const planOf = (topicId: string): PlanTopic | undefined => plan?.topics.find((topic) => topic.topicId === topicId);
  const titleOf = (topicId: string) => topics.find((topic) => topic.topicId === topicId)?.title ?? '';
  const week = weekMinutes(days);

  const setDay = (index: number, patch: Partial<CycleDay>) =>
    setDays((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  const setTopic = (topicId: string, patch: Partial<DraftTopic>) =>
    setTopics((current) => current.map((topic) => (topic.topicId === topicId ? { ...topic, ...patch } : topic)));
  /** A tap on a picker row: takes a picked subject out, adds an open one, leaves a closed one. */
  const toggleTopic = (option: SubjectOption) =>
    setTopics((current) =>
      current.some((draft) => draft.topicId === option.id)
        ? current.filter((draft) => draft.topicId !== option.id)
        : current.length >= MAX_TOPICS || option.disabledReason !== null
          ? current
          : [...current, { topicId: option.id, title: option.title, rootTitle: option.rootTitle, importance: 3, mastery: 3, minutesOverride: null }],
    );

  /** Why a picker row is closed, in a line under it; null when it is open or already picked. */
  const closedReason = (option: SubjectOption): string | null => {
    const reason = option.disabledReason;
    if (reason === null || reason === 'picked') return null;
    if (reason === 'overlapsPicked') return t('StudyCycleMobileSubjectOverlap');
    return takenBy[option.id]
      ? t('StudyCycleMobileTopicTaken', { name: reason.takenBy })
      : t('StudyCycleMobileSubjectNearTaken', { name: reason.takenBy });
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/notebook-cycles'));

  const save = async () => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      notify.error(t('StudyCycleMobileNameRequired'));
      return;
    }
    if (topics.length === 0) {
      notify.error(t('StudyCycleMobileTopicsRequired'));
      return;
    }
    setSaving(true);
    const request = { name: trimmed, defaultMode, ...planRequest };
    const response = editId ? await updateStudyCycle(editId, request, t) : await createStudyCycle(request, t);
    if (!response.success) {
      setSaving(false);
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    const saved = response.success;
    dispatch(enterStudyCycle(saved));
    await refreshStudyCycles(dispatch, store.getState().studyCycles, t);
    setSaving(false);
    notify.success(t(editId ? 'StudyCycleMobileCycleSaved' : 'StudyCycleMobileCycleCreated', { name: saved.name }));
    if (editId) close();
    else router.replace({ pathname: '/notebook-cycles', params: { id: saved.id } });
  };

  const maxBlockOptions = MAX_BLOCK_CHOICES.includes(maxBlock) ? MAX_BLOCK_CHOICES : [...MAX_BLOCK_CHOICES, maxBlock].sort((a, b) => a - b);

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: insets.top, paddingBottom: lift > 0 ? lift : insets.bottom }}
      onLayout={onLayout}
      testID="cycle-edit-screen"
    >
      <View className="flex-row items-center gap-1 px-2 pb-2 pt-1">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Cancel')} className="h-11 w-11 items-center justify-center" testID="cycle-edit-close">
          <X size={20} color={theme.text} />
        </Pressable>
        <Text accessibilityRole="header" className="min-w-0 flex-1 text-[18px] font-semibold text-text" numberOfLines={1}>
          {t(editId ? 'StudyCycleMobileEditCycle' : 'StudyCycleMobileNewCycle')}
        </Text>
        <Button text={t('Save')} mode="primary" size="auto" submitting={saving} disabled={!hydrated} onPress={() => void save()} testID="cycle-edit-save" />
      </View>

      {!hydrated ? (
        <View className="flex-1 items-center justify-center" testID="cycle-edit-loading">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Input
            compact
            label={t('StudyCycleMobileName')}
            required
            value={name}
            onChangeText={setName}
            maxLength={80}
            placeholder={t('StudyCycleMobileNamePlaceholder')}
            testID="cycle-edit-name"
          />

          <Card className="gap-2.5" testID="cycle-edit-week">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileWeek')}</Text>
              <Text className="font-mono-semibold text-[12px] text-text-2" testID="cycle-edit-week-total">
                {formatStudyMinutes(week)}
              </Text>
            </View>
            {days.map((day, index) => (
              <View key={day.weekday} className="flex-row items-center gap-2" testID={`cycle-edit-day-${day.weekday}`}>
                <Text className="w-10 text-[13px] font-semibold text-text">{weekdayLabel(day.weekday, i18n.language)}</Text>
                <IconButton
                  label={t('StudyCycleMobileLessOn', { day: weekdayLabel(day.weekday, i18n.language, 'long') })}
                  disabled={day.minutes <= 0}
                  onPress={() => setDay(index, { minutes: Math.max(0, day.minutes - DAY_STEP) })}
                  testID={`cycle-edit-day-${day.weekday}-less`}
                >
                  <Minus size={16} color={theme.text2} />
                </IconButton>
                <Text className="w-[58px] text-center font-mono-semibold text-[12.5px] text-text" testID={`cycle-edit-day-${day.weekday}-minutes`}>
                  {day.minutes > 0 ? formatStudyMinutes(day.minutes) : t('StudyCycleMobileRest')}
                </Text>
                <IconButton
                  label={t('StudyCycleMobileMoreOn', { day: weekdayLabel(day.weekday, i18n.language, 'long') })}
                  disabled={day.minutes >= DAY_MAX}
                  onPress={() => setDay(index, { minutes: Math.min(DAY_MAX, day.minutes + DAY_STEP) })}
                  testID={`cycle-edit-day-${day.weekday}-more`}
                >
                  <Plus size={16} color={theme.text2} />
                </IconButton>
                <TimeField value={day.startTime ?? ''} onChange={(value) => setDay(index, { startTime: value })} testID={`cycle-edit-day-${day.weekday}-start`} />
                {day.startTime ? (
                  <IconButton
                    label={t('StudyCycleMobileClearStart')}
                    onPress={() => setDay(index, { startTime: null })}
                    testID={`cycle-edit-day-${day.weekday}-clear`}
                  >
                    <X size={14} color={theme.text3} />
                  </IconButton>
                ) : null}
              </View>
            ))}
            <Text className="text-[12px] leading-4 text-text-3">{t('StudyCycleMobileStartHint')}</Text>
          </Card>

          <View>
            <Text className="mb-1.5 text-[15px] font-semibold text-text">{t('StudyCycleMobileDefaultMode')}</Text>
            <SegmentedControl<BlockMode>
              label={t('StudyCycleMobileDefaultMode')}
              options={[
                { value: 'TIME', label: t('StudyCycleMobileModeTime'), description: t('StudyCycleMobileModeTimeHint') },
                { value: 'GOAL', label: t('StudyCycleMobileModeGoal'), description: t('StudyCycleMobileModeGoalHint') },
              ]}
              value={defaultMode}
              onChange={setDefaultMode}
              testID="cycle-edit-mode"
            />
          </View>

          <View>
            <Text className="mb-1.5 text-[15px] font-semibold text-text">{t('StudyCycleMobileMaxBlock')}</Text>
            <SegmentedControl<number>
              label={t('StudyCycleMobileMaxBlock')}
              options={maxBlockOptions.map((value) => ({ value, label: formatStudyMinutes(value) }))}
              value={maxBlock}
              onChange={setMaxBlock}
              testID="cycle-edit-max"
            />
            <Text className="mt-1 text-[12px] text-text-3">{t('StudyCycleMobileMaxBlockHint')}</Text>
          </View>

          <View className="gap-2" testID="cycle-edit-topics">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileTopicsAndWeights')}</Text>
              <Text className="text-[12px] text-text-2">{t('StudyCycleMobileWeekToShare', { time: formatStudyMinutes(week) })}</Text>
            </View>
            {topics.map((topic) => (
              <TopicCard
                key={topic.topicId}
                topic={topic}
                plan={planOf(topic.topicId)}
                goal={defaultMode === 'GOAL'}
                onChange={(patch) => setTopic(topic.topicId, patch)}
                onRemove={() => setTopics((current) => current.filter((draft) => draft.topicId !== topic.topicId))}
              />
            ))}
            <Button
              text={t('StudyCycleMobileAddTopic')}
              mode="default"
              size="block"
              icon={<Plus size={16} color={theme.text} />}
              onPress={() => setPicking(true)}
              testID="cycle-edit-add-topic"
            />
            <Text className="text-[12px] leading-4 text-text-3">{t('StudyCycleMobileWeightHint')}</Text>
          </View>

          {plan && topics.length > 0 ? (
            <Card className="gap-2.5" testID="cycle-edit-order">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileBlockOrder')}</Text>
                <Text className="text-[12px] text-text-2">
                  {t('StudyCycleMobileBlockCount', { count: plan.blocks.length, time: formatStudyMinutes(plan.plannedMinutes) })}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {[...plan.blocks]
                  .sort((a, b) => a.position - b.position)
                  .map((block) => (
                    <View key={block.position} className="flex-row items-center gap-1 rounded-full bg-surface-2 px-2 py-1" testID="cycle-edit-order-block">
                      <Text className="font-mono-semibold text-[11px] text-text-3">{block.position}</Text>
                      <Text className="max-w-[110px] text-[12px] font-semibold text-text" numberOfLines={1}>
                        {titleOf(block.topicId)}
                      </Text>
                      {defaultMode === 'GOAL' ? <Target size={11} color={theme.accent} /> : null}
                      <Text className="font-mono text-[11px] text-text-2">{`${block.plannedMinutes}′`}</Text>
                    </View>
                  ))}
              </View>
              <Text className="text-[12px] leading-4 text-text-3">{t('StudyCycleMobileOrderHint')}</Text>
              <View className="border-t border-border pt-2">
                <Text className="text-[14px] font-semibold text-text" testID="cycle-edit-lap">
                  {t('StudyCycleMobileOneLap', { time: formatStudyMinutes(plan.plannedMinutes) })}
                </Text>
                <Text className="text-[12.5px] text-text-2">
                  {plan.lapDays !== null ? t('StudyCycleMobileLapDays', { count: Math.max(1, plan.lapDays) }) : t('StudyCycleMobileNoWeek')}
                </Text>
              </View>
            </Card>
          ) : null}

          <Button
            text={t(editId ? 'Save' : 'StudyCycleMobileCreate')}
            mode="primary"
            size="block"
            submitting={saving}
            onPress={() => void save()}
            testID="cycle-edit-save-bottom"
          />
        </ScrollView>
      )}

      <BottomSheet visible={picking} onClose={() => setPicking(false)} closeLabel="Close">
        <Text accessibilityRole="header" className="mb-1 text-[16px] font-semibold text-text">
          {t('StudyCycleMobileAddTopic')}
        </Text>
        <Text className="mb-1 text-[12px] leading-4 text-text-3">{t('StudyCycleSubjectHint')}</Text>
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} testID="cycle-edit-topic-picker">
          {options === null ? (
            <ActivityIndicator color={theme.accent} />
          ) : options.length === 0 ? (
            <Text className="py-3 text-[13px] text-text-2">{t('StudyCycleMobileNoTopics')}</Text>
          ) : (
            options.map((option) => {
              const chosen = option.disabledReason === 'picked';
              const reason = closedReason(option);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleTopic(option)}
                  disabled={reason !== null}
                  accessibilityRole="checkbox"
                  accessibilityLabel={subjectLabel(option)}
                  accessibilityHint={reason ?? undefined}
                  accessibilityState={{ checked: chosen, disabled: reason !== null }}
                  className={`flex-row items-center gap-3 py-3 ${reason ? 'opacity-50' : ''}`}
                  style={{ paddingLeft: option.depth * 18 }}
                  testID={`cycle-edit-pick-${option.id}`}
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-[14.5px] ${chosen ? 'font-semibold text-accent' : option.depth === 0 ? 'font-semibold text-text' : 'text-text'}`}
                    >
                      {option.title}
                    </Text>
                    {reason ? <Text className="text-[12px] text-text-2">{reason}</Text> : null}
                  </View>
                  {chosen ? <Check size={17} color={theme.accent} /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <Button text={t('StudyCycleMobileDone')} mode="tonal" size="block" className="mt-2" onPress={() => setPicking(false)} testID="cycle-edit-pick-done" />
      </BottomSheet>
    </View>
  );
}

/** One topic of the cycle: how much it matters, how well it is known, and the minutes it gets. */
function TopicCard({
  topic, plan, goal, onChange, onRemove,
}: {
  topic: DraftTopic;
  plan: PlanTopic | undefined;
  goal: boolean;
  onChange: (patch: Partial<DraftTopic>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <Card className="gap-2.5" testID="cycle-edit-topic">
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-[15px] font-semibold text-text" numberOfLines={1} testID="cycle-edit-topic-title">
          <RootPrefix root={topic.rootTitle} className="text-[12.5px]" />
          {topic.title}
        </Text>
        <IconButton label={t('StudyCycleMobileRemoveTopic', { title: subjectLabel(topic) })} onPress={onRemove} testID="cycle-edit-topic-remove">
          <X size={16} color={theme.text3} />
        </IconButton>
      </View>
      <View className="flex-row gap-3">
        <Stepper
          label={t('StudyCycleMobileImportance')}
          value={topic.importance}
          onChange={(importance) => onChange({ importance })}
          testID="cycle-edit-importance"
        />
        <Stepper
          label={t('StudyCycleMobileMastery')}
          value={topic.mastery}
          onChange={(mastery) => onChange({ mastery })}
          testID="cycle-edit-mastery"
        />
      </View>
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[12px] text-text-2" testID="cycle-edit-weight">
            {plan
              ? t('StudyCycleMobileWeight', { weight: plan.weight, share: Math.round(plan.share * 100) })
              : t('StudyCycleMobileWeightPending')}
          </Text>
          {plan ? (
            <Text className="text-[12px] text-text-2">{t('StudyCycleMobileBlocksPlanned', { count: plan.blocks })}</Text>
          ) : null}
        </View>
        <MinutesField
          value={topic.minutesOverride}
          suggested={plan?.suggestedMinutes ?? null}
          label={t('StudyCycleMobileTopicMinutes', { title: subjectLabel(topic) })}
          onChange={(minutesOverride) => onChange({ minutesOverride })}
        />
      </View>
      {goal ? <Text className="text-[11.5px] text-text-3">{t('StudyCycleMobileEstimateNotGoal')}</Text> : null}
      {topic.minutesOverride !== null && plan ? (
        <Pressable onPress={() => onChange({ minutesOverride: null })} accessibilityRole="button" className="self-start py-1" testID="cycle-edit-reset">
          <Text className="text-[12.5px] font-semibold text-accent">
            {t('StudyCycleMobileBackToSuggestion', { time: formatStudyMinutes(plan.suggestedMinutes) })}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** A 1..5 value with − and + on either side. */
function Stepper({ label, value, onChange, testID }: { label: string; value: number; onChange: (value: number) => void; testID: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[12px] font-semibold text-text-2">{label}</Text>
      <View className="flex-row items-center justify-between rounded-control border border-border px-1 py-1">
        <IconButton label={t('StudyCycleMobileLessOf', { what: label })} disabled={value <= 1} onPress={() => onChange(value - 1)} testID={`${testID}-less`}>
          <Minus size={15} color={theme.text2} />
        </IconButton>
        <Text className="font-mono-semibold text-[14px] text-text" testID={`${testID}-value`}>
          {value}
        </Text>
        <IconButton label={t('StudyCycleMobileMoreOf', { what: label })} disabled={value >= 5} onPress={() => onChange(value + 1)} testID={`${testID}-more`}>
          <Plus size={15} color={theme.text2} />
        </IconButton>
      </View>
    </View>
  );
}

/**
 * The topic's minutes in a lap. Empty shows the suggestion and leaves it to the planner; a typed
 * number between 5 and 600 overrides it. The text may pass through values the planner would
 * refuse on the way to the one meant ("7" before "70"): those stay in the box and are not sent.
 */
function MinutesField({
  value, suggested, label, onChange,
}: {
  value: number | null;
  suggested: number | null;
  label: string;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => {
    setText(value === null ? '' : String(value));
  }, [value]);
  return (
    <View className="w-[96px]">
      <Input
        compact
        value={text}
        onChangeText={(raw) => {
          const digits = raw.replace(/[^0-9]/g, '');
          setText(digits);
          if (!digits) return onChange(null);
          const minutes = Number.parseInt(digits, 10);
          if (minutes >= 5 && minutes <= 600) onChange(minutes);
        }}
        onEndEditing={() => setText(value === null ? '' : String(value))}
        placeholder={suggested !== null ? String(suggested) : '–'}
        keyboardType="number-pad"
        maxLength={3}
        accessibilityLabel={label}
        testID="cycle-edit-topic-minutes"
      />
    </View>
  );
}
