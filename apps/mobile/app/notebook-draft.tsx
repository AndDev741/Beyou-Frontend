import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Check, RotateCcw, Sparkles, X } from 'lucide-react-native';
import getGoals from '@beyou/api/goals/getGoals';
import { createTopicFromDraft, getRoadmapDraft, redraftRoadmap, saveDraftChoices, startRoadmapDraft } from '@beyou/api/notebook';
import { getFriendlyErrorMessage, type ApiErrorPayload } from '@beyou/api/apiError';
import {
  DRAFT_CHOICES_SAVE_MS,
  DRAFT_HOURS,
  DRAFT_POLL_MS,
  EMPTY_DRAFT_FORM,
  draftChoices,
  draftForm,
  draftPlan,
  draftRequest,
  draftRows,
  enterNotebookPage,
  topicFromDraft,
  type DraftForm,
  type DraftRow,
} from '@beyou/state';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import type { goal } from '@beyou/types/goals/goalType';
import type { DraftChoice, RoadmapDraftRecord, StudyLevel } from '@beyou/types/notebook/notebook';
import Button from '../src/ui/Button';
import Input from '../src/ui/Input';
import SegmentedControl from '../src/ui/SegmentedControl';
import SelectField from '../src/ui/SelectField';
import FormNotice from '../src/ui/auth/FormNotice';
import { AiWaitingLine } from '../src/notebook/AiWaiting';
import { useKeyboardLift } from '../src/ui/keyboard';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../src/store';

const LEVELS: { value: StudyLevel; key: string }[] = [
  { value: 'NEW', key: 'NotebookAiLevelNew' },
  { value: 'SOME', key: 'NotebookAiLevelSome' },
  { value: 'SOLID', key: 'NotebookAiLevelSolid' },
];

/**
 * "New topic with AI" on the phone: the web's dialog as one screen, the form and then the draft
 * under it. Full screen and outside the `(app)` group like the editor, so the bottom bar never
 * sits between the form and the keyboard.
 *
 * The draft lives on the server and the model writes it in the background, so the screen can be
 * left at any point and nothing is lost: the draft waits on the notebook home and opens back here
 * (`?id=`) with its form, its nodes and the person's ticks. While the model works the screen reads
 * the draft back every few seconds. Nothing in the notebook changes until "Create".
 */
export default function NotebookDraftScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { lift, onLayout } = useKeyboardLift();
  const { id: draftId, title: startTitle } = useLocalSearchParams<{ id?: string; title?: string }>();
  const goals = useSelector((s: RootState) => s.goals.goals) as goal[];
  const [form, setForm] = useState<DraftForm>({ ...EMPTY_DRAFT_FORM, title: startTitle ?? '' });
  const [editingForm, setEditingForm] = useState(!draftId);
  const [draft, setDraft] = useState<RoadmapDraftRecord | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [opening, setOpening] = useState(!!draftId);
  const [change, setChange] = useState('');
  const [busy, setBusy] = useState<'draft' | 'create' | null>(null);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const pendingChoices = useRef<{ draftId: string; choices: DraftChoice[] } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scroll = useRef<ScrollView>(null);
  const drafting = draft?.status === 'DRAFTING';

  useEffect(() => {
    if (goals.length === 0) {
      void getGoals(t).then((response) => {
        if (Array.isArray(response.success)) dispatch(enterGoals(response.success as goal[]));
      });
    }
  }, [goals.length, t, dispatch]);

  /** Shows what the server has. `refill` also puts the request back into the form. */
  const apply = useCallback((next: RoadmapDraftRecord, refill: boolean) => {
    setDraft(next);
    setRows(draftRows(next));
    setError(next.status === 'FAILED' && next.errorKey ? { errorKey: next.errorKey } : null);
    if (refill) setForm(draftForm(next.request));
  }, []);

  // A stored draft opens where the person left it.
  useEffect(() => {
    if (!draftId) return;
    let current = true;
    void getRoadmapDraft(draftId, t).then((response) => {
      if (!current) return;
      setOpening(false);
      if (response.success) apply(response.success, true);
      else setError(response.error ?? null);
    });
    return () => {
      current = false;
    };
  }, [draftId, t, apply]);

  // While the model writes, read the draft back until it is READY or FAILED.
  useEffect(() => {
    if (!draft || draft.status !== 'DRAFTING') return;
    const id = draft.id;
    const timer = setInterval(() => {
      void getRoadmapDraft(id, t).then((response) => {
        if (response.success?.id !== id || response.success.status === 'DRAFTING') return;
        apply(response.success, false);
      });
    }, DRAFT_POLL_MS);
    return () => clearInterval(timer);
  }, [draft, t, apply]);

  const flushChoices = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const pending = pendingChoices.current;
    pendingChoices.current = null;
    if (pending) await saveDraftChoices(pending.draftId, pending.choices, t);
  }, [t]);

  // Ticks still waiting on the debounce go when the screen does.
  useEffect(() => () => void flushChoices(), [flushChoices]);

  /** Changes one row and saves the ticks shortly after, so a reopened draft has them. */
  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    if (!rows || !draft || drafting) return;
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setRows(next);
    pendingChoices.current = { draftId: draft.id, choices: draftChoices(next) };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushChoices(), DRAFT_CHOICES_SAVE_MS);
  };

  const runDraft = async (revision?: string) => {
    if (!form.title.trim() || busy || drafting) return;
    setBusy('draft');
    setError(null);
    await flushChoices();
    const request = draftRequest(form, revision, rows);
    const response = draft ? await redraftRoadmap(draft.id, request, t) : await startRoadmapDraft(request, t);
    setBusy(null);
    if (!response.success) {
      setError(response.error ?? null);
      return;
    }
    apply(response.success, false);
    setChange('');
    setEditingForm(false);
    // A change is asked for under the last node; the wait shows above the first.
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const create = async () => {
    if (!rows || !rows.some((row) => row.keep)) return;
    setBusy('create');
    setError(null);
    clearTimeout(saveTimer.current);
    pendingChoices.current = null;
    const response = await createTopicFromDraft(topicFromDraft(form, rows, draft?.id ?? null), t);
    setBusy(null);
    if (!response.success) {
      setError(response.error ?? null);
      return;
    }
    dispatch(enterNotebookPage(response.success));
    router.replace(`/notebook/${response.success.id}`);
  };

  /** Leaving never loses anything: the draft is on the server, and pending ticks go on unmount. */
  const close = () => (router.canGoBack() ? router.back() : router.replace('/notebook'));

  const set = (patch: Partial<DraftForm>) => setForm((current) => ({ ...current, ...patch }));
  const { kept, weeks } = draftPlan(rows, form.hours);

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: insets.top, paddingBottom: lift > 0 ? lift : insets.bottom }}
      onLayout={onLayout}
      testID="notebook-draft"
    >
      <View className="flex-row items-center gap-1 px-2 pb-1.5 pt-1">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Close')} className="h-11 w-11 items-center justify-center" testID="draft-close">
          <X size={20} color={theme.text} />
        </Pressable>
        <Sparkles size={18} color={theme.accent} />
        <Text accessibilityRole="header" className="ml-1 flex-1 text-[16px] font-bold text-text">{t('NotebookAiTitle')}</Text>
      </View>

      {opening ? (
        <View className="flex-1 items-center justify-center" testID="draft-opening">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView ref={scroll} className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          {editingForm ? (
            <View className="gap-4" testID="draft-form">
              <Input
                label={t('NotebookAiWhat')}
                value={form.title}
                onChangeText={(title) => set({ title })}
                maxLength={255}
                placeholder={t('NotebookTopicTitlePlaceholder')}
                testID="draft-what"
              />
              <Input
                label={t('NotebookAiWhy')}
                value={form.why}
                onChangeText={(why) => set({ why })}
                maxLength={600}
                multiline
                testID="draft-why"
              />
              <View className="gap-1.5">
                <Text className="text-[13px] font-semibold text-text">{t('NotebookAiLevel')}</Text>
                <SegmentedControl<StudyLevel>
                  label={t('NotebookAiLevel')}
                  options={LEVELS.map((level) => ({ value: level.value, label: t(level.key) }))}
                  value={form.level}
                  onChange={(level) => set({ level })}
                  testID="draft-level"
                />
              </View>
              <View className="gap-1.5">
                <Text className="text-[13px] font-semibold text-text">{t('NotebookAiHours')}</Text>
                <View className="flex-row gap-2" accessibilityRole="radiogroup">
                  {DRAFT_HOURS.map((hours) => {
                    const chosen = form.hours === hours;
                    return (
                      <Pressable
                        key={hours}
                        onPress={() => set({ hours })}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosen }}
                        className={`h-9 justify-center rounded-full border px-4 ${chosen ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
                        testID={`draft-hours-${hours}`}
                      >
                        <Text className={`font-mono-semibold text-[13px] ${chosen ? 'text-accent' : 'text-text-2'}`}>
                          {t('NotebookAiHoursValue', { hours })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View className="gap-1.5">
                <Text className="text-[13px] font-semibold text-text">{`${t('NotebookLinkGoal')} ${t('NotebookOptional')}`}</Text>
                <SelectField
                  label={`${t('NotebookLinkGoal')} ${t('NotebookOptional')}`}
                  value={form.goalId}
                  options={[{ value: '', label: t('NotebookLinkNone') }, ...goals.map((g) => ({ value: g.id, label: g.name }))]}
                  onChange={(goalId) => set({ goalId })}
                  testID="draft-goal"
                />
              </View>
              <Input
                label={`${t('NotebookAiBasedOn')} ${t('NotebookOptional')}`}
                value={form.reference}
                onChangeText={(reference) => set({ reference })}
                maxLength={500}
                autoCapitalize="none"
                placeholder={t('NotebookAiBasedOnPlaceholder')}
                testID="draft-reference"
              />
              <Button
                text={busy === 'draft' || drafting ? t('NotebookAiDrafting') : rows ? t('NotebookAiDraftAgain') : t('NotebookAiDraft')}
                mode="tonal"
                size="block"
                icon={rows ? <RotateCcw size={15} color={theme.accent} /> : <Sparkles size={15} color={theme.accent} />}
                disabled={!form.title.trim() || busy !== null || drafting}
                onPress={() => void runDraft()}
                testID="draft-run"
              />
            </View>
          ) : (
            <View className="flex-row items-center gap-2 rounded-xl border border-border bg-surface py-1.5 pl-3 pr-1.5" testID="draft-request">
              <Text className="min-w-0 flex-1 text-[13px] text-text-2" numberOfLines={2}>
                <Text className="font-semibold text-text">{form.title}</Text>
                {` · ${t(LEVELS.find((level) => level.value === form.level)?.key ?? 'NotebookAiLevelSome')} · ${t('NotebookAiHoursValue', { hours: form.hours })}`}
              </Text>
              <Button text={t('Edit')} mode="ghost" size="auto" disabled={drafting} onPress={() => setEditingForm(true)} testID="draft-edit" />
            </View>
          )}

          <View className="gap-3" testID="draft-panel">
            <View className="flex-row flex-wrap items-baseline justify-between gap-2">
              <Text className="text-[15px] font-semibold text-text">{t('NotebookAiDraftTitle')}</Text>
              {rows ? (
                <Text className="text-[12px] text-text-2" testID="draft-summary">
                  {t('NotebookAiDraftSummary', { kept, total: rows.length, weeks, hours: form.hours })}
                </Text>
              ) : null}
            </View>

            {error ? <FormNotice tone="error" message={getFriendlyErrorMessage(t, error)} testID="draft-error" /> : null}

            {draft && drafting ? (
              <View className="gap-2" testID="draft-waiting">
                <View className="flex-row items-center gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-3">
                  <ActivityIndicator color={theme.accent} />
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-[14px] font-semibold text-text">
                      {rows ? t('NotebookAiWaitRevising') : t('NotebookAiWaitDrafting', { title: draft.title })}
                    </Text>
                    <AiWaitingLine label={t('NotebookAiWaitUsual')} since={draft.startedAt} />
                  </View>
                </View>
              </View>
            ) : null}

            {!rows && !drafting ? (
              <Text className="rounded-2xl border border-dashed border-border p-5 text-[13px] leading-[19px] text-text-2" testID="draft-empty">
                {t('NotebookAiDraftEmpty')}
              </Text>
            ) : null}

            {rows ? (
              <View className="gap-2" style={{ opacity: drafting ? 0.5 : 1 }} pointerEvents={drafting ? 'none' : 'auto'}>
                {rows.map((row, i) => (
                  <DraftNodeRow key={`${row.title}-${i}`} row={row} index={i} onChange={(patch) => updateRow(i, patch)} />
                ))}
              </View>
            ) : null}

            {rows ? (
              <View className="flex-row items-center gap-2">
                <View className="min-w-0 flex-1">
                  <Input
                    iconStart={<Sparkles size={15} color={theme.accent} />}
                    value={change}
                    onChangeText={setChange}
                    maxLength={500}
                    compact
                    placeholder={t('NotebookAiChangePlaceholder')}
                    accessibilityLabel={t('NotebookAiChangePlaceholder')}
                    returnKeyType="send"
                    onSubmitEditing={() => change.trim() && void runDraft(change.trim())}
                    testID="draft-change"
                  />
                </View>
                <Button
                  text={t('NotebookAiApply')}
                  mode="tonal"
                  size="auto"
                  disabled={!change.trim() || busy !== null || drafting}
                  onPress={() => void runDraft(change.trim())}
                  testID="draft-apply"
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* Out of the way while the keyboard is up: typing is for the form or a change, and the
          footer would take a third of what is left above the keyboard. */}
      {lift > 0 ? null : (
        <View className="gap-2 border-t border-border bg-surface px-4 pb-3 pt-2.5">
          <Text className="text-[12px] leading-[16px] text-text-2" testID={draft ? 'draft-saved' : undefined}>
            {draft ? t('NotebookAiDraftSaved') : t('NotebookAiNothingUntil')}
          </Text>
          <Button
            text={busy === 'create' ? t('NotebookAiCreating') : t('NotebookAiCreate', { count: kept })}
            mode="primary"
            size="block"
            submitting={busy === 'create'}
            disabled={!rows || kept === 0 || busy !== null || drafting}
            onPress={() => void create()}
            testID="draft-create"
          />
        </View>
      )}
    </View>
  );
}

/**
 * One drafted node: a tap keeps it or leaves it out. A node the person already studies elsewhere
 * is offered as a link, so one page and one progress serve both topics, or as a new copy.
 */
function DraftNodeRow({ row, index, onChange }: { row: DraftRow; index: number; onChange: (patch: Partial<DraftRow>) => void }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className={`gap-2 rounded-[14px] border border-border bg-surface px-3 py-3 ${row.keep ? '' : 'opacity-60'}`} testID="draft-node">
      <Pressable
        onPress={() => onChange({ keep: !row.keep })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.keep }}
        accessibilityLabel={t('NotebookAiKeepNode', { title: row.title })}
        className="flex-row items-start gap-3"
        testID="draft-node-keep"
      >
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${row.keep ? 'border-accent bg-accent' : 'border-border bg-surface'}`}
        >
          {row.keep ? <Check size={13} color={theme.onAccent} strokeWidth={3} /> : null}
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-baseline gap-2">
            <Text className="font-mono text-[12px] text-text-2">{String(index + 1).padStart(2, '0')}</Text>
            <Text className={`min-w-0 flex-1 text-[14px] font-semibold text-text ${row.keep ? '' : 'line-through'}`}>{row.title}</Text>
          </View>
          {row.why ? <Text className="text-[13px] leading-[18px] text-text-2">{row.why}</Text> : null}
          <Text className="font-mono text-[11px] text-text-2">
            {row.link ? t('NotebookAiLinked') : t('NotebookAiNodeMeta', { subtopics: row.subtopics.length, hours: row.estimatedHours })}
          </Text>
        </View>
      </Pressable>

      {row.existingPageId ? (
        <View className="gap-2 rounded-xl bg-accent-soft px-3 py-2.5">
          <Text className="text-[12.5px] leading-[17px] text-text">
            {t('NotebookAiExisting', {
              topic: row.existingTopicTitle ?? '',
              done: row.existingProgress?.done ?? 0,
              total: row.existingProgress?.total ?? 0,
            })}
          </Text>
          <SegmentedControl<'link' | 'copy'>
            label={t('NotebookAiLinkOrCopy')}
            options={[
              { value: 'link', label: t('NotebookAiLinkIt') },
              { value: 'copy', label: t('NotebookAiNewCopy') },
            ]}
            value={row.link ? 'link' : 'copy'}
            onChange={(value) => onChange({ link: value === 'link' })}
            testID="draft-node-link"
          />
        </View>
      ) : null}

      {!row.link && row.subtopics.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5 pl-8">
          {row.subtopics.map((subtopic) => (
            <View key={subtopic} className="rounded-lg bg-surface-2 px-2.5 py-1">
              <Text className="text-[12px] text-text">{subtopic}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
