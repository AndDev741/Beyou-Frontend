import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { logStudySession } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  addDaysIso, blockTitle, blockTitleRoot, creditTarget, factsOfBlock, formatStudyMinutes, refreshStudyCycles, subjectLabel,
} from '@beyou/state';
import type { StudyBlock, StudyCycle } from '@beyou/types/notebook/studyCycle';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import SelectField from '../../ui/SelectField';
import DateField from '../../ui/goals/DateField';
import FieldLabel from '../../ui/form/FieldLabel';
import useTodayInZone from '../../ui/useTodayInZone';
import ProgressBar from '../ProgressBar';
import { notify } from '../../notify';
import type { AppDispatch, RootState } from '../../store';
import { SESSION_DAYS_BACK, SESSION_MINUTES } from './cycleText';
import { useCyclesInFull, useNotebookTopics, useSubjectPages } from './useCycleData';
import RootPrefix from './RootPrefix';

const NO_PAGE = '';

interface LogSessionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The topic the sheet opens on; the first cycle's first topic otherwise. */
  topicId?: string | null;
  /** After the session is saved and the cycles re-read. */
  onLogged?: () => void;
}

/**
 * A subject the session can go to, and the cycle that holds it (null outside every cycle).
 * `label` names a page inside a topic with its root: "Software Engineer › Implementação 2.0".
 */
type TopicChoice = { id: string; title: string; label: string; cycle: StudyCycle | null };

/**
 * "Log a session": study done outside the timer (a book, a class, exercises on paper). Topic, an
 * optional page, the day (today by default, at most 30 days back), the minutes and a note. Above
 * the button, the block the minutes will land on, from the loaded cycle by the server's own rule
 * (`creditTarget`): the topic's first open block, else its last.
 *
 * The cycles' topics come first, named with their cycle; the notebook's other topics follow, and
 * a session on one of them is kept without moving any block.
 */
export default function LogSessionSheet({ visible, onClose, topicId, onLogged }: LogSessionSheetProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const today = useTodayInZone();
  const { cycles, load } = useCyclesInFull();
  const notebookTopics = useNotebookTopics(visible);

  const [chosenTopic, setChosenTopic] = useState<string | null>(null);
  const [pageId, setPageId] = useState(NO_PAGE);
  const [studiedOn, setStudiedOn] = useState(today);
  const [minutesText, setMinutesText] = useState('45');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // A fresh form every time the sheet opens, on the topic it was opened for.
  useEffect(() => {
    if (!visible) return;
    setChosenTopic(topicId ?? null);
    setPageId(NO_PAGE);
    setStudiedOn(today);
    setMinutesText('45');
    setNote('');
    void load();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const choices = useMemo<TopicChoice[]>(() => {
    const inCycles = cycles.flatMap((cycle) =>
      cycle.topics.map((topic) => ({ id: topic.topicId, title: topic.topic.title, label: subjectLabel(topic.topic), cycle })),
    );
    const taken = new Set(inCycles.map((choice) => choice.id));
    const others = (notebookTopics ?? [])
      .filter((topic) => !taken.has(topic.id))
      .map((topic) => ({ id: topic.id, title: topic.title, label: topic.title, cycle: null }));
    return [...inCycles, ...others];
  }, [cycles, notebookTopics]);

  const topic = choices.find((choice) => choice.id === chosenTopic) ?? choices[0] ?? null;
  // The subject's own pages, read only while the sheet is open.
  const pages = useSubjectPages(visible ? topic : null);
  const minutes = Number.parseInt(minutesText, 10);
  const validMinutes = Number.isInteger(minutes) && minutes >= 1 && minutes <= 600;
  const target = topic?.cycle ? creditTarget(topic.cycle, topic.id) : null;
  const earliest = addDaysIso(today, -SESSION_DAYS_BACK);

  const submit = async () => {
    if (!topic || !validMinutes || saving) return;
    setSaving(true);
    const response = await logStudySession(
      { topicId: topic.id, pageId: pageId || null, minutes, studiedOn, note: note.trim() || null },
      t,
    );
    if (response.error || !response.success) {
      setSaving(false);
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    const credited = response.success.credited;
    notify.success(
      credited
        ? t('StudyCycleMobileLogged', {
            minutes: formatStudyMinutes(minutes),
            position: credited.position,
            cycle: credited.cycleName,
          })
        : t('StudyCycleMobileLoggedNoCycle', { minutes: formatStudyMinutes(minutes) }),
      credited
        ? { subtitle: t('StudyCycleMobileLoggedDetail', { before: credited.minutesBefore, after: credited.minutesAfter, planned: credited.plannedMinutes }) }
        : undefined,
    );
    await refreshStudyCycles(dispatch, store.getState().studyCycles, t);
    setSaving(false);
    onLogged?.();
    onClose();
  };

  const pageOptions = [
    { value: NO_PAGE, label: t('StudyCycleMobileNoPage') },
    ...pages.map((page) => ({ value: page.id, label: `${'  '.repeat(page.depth)}${page.title}` })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close" dismissable={!saving}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" testID="log-session-sheet">
        <View className="gap-3.5 pb-1">
          <View className="gap-1">
            <Text accessibilityRole="header" className="text-[17px] font-semibold text-text">
              {t('StudyCycleMobileLogSession')}
            </Text>
            <Text className="text-[13px] leading-[18px] text-text-2">{t('StudyCycleMobileLogIntro')}</Text>
          </View>

          {topic ? (
            <View>
              <FieldLabel>{t('StudyCycleMobileTopic')}</FieldLabel>
              <SelectField
                label={t('StudyCycleMobileTopic')}
                value={topic.id}
                options={choices.map((choice) => ({
                  value: choice.id,
                  label: choice.cycle ? `${choice.label} · ${choice.cycle.name}` : choice.label,
                }))}
                onChange={(value) => {
                  setChosenTopic(value);
                  setPageId(NO_PAGE);
                }}
                testID="log-session-topic"
              />
            </View>
          ) : (
            <Text className="text-[13px] text-text-2" testID="log-session-no-topics">
              {t('StudyCycleMobileNoTopics')}
            </Text>
          )}

          {topic ? (
            <View>
              <FieldLabel optional>{t('StudyCycleMobilePage')}</FieldLabel>
              <SelectField
                label={t('StudyCycleMobilePage')}
                value={pageId}
                options={pageOptions}
                onChange={setPageId}
                testID="log-session-page"
              />
            </View>
          ) : null}

          <View>
            <FieldLabel>{t('StudyCycleMobileDay')}</FieldLabel>
            <View className="flex-row items-center gap-2">
              <QuickChoice label={t('StudyCycleMobileToday')} active={studiedOn === today} onPress={() => setStudiedOn(today)} testID="log-session-today" />
              <QuickChoice
                label={t('StudyCycleMobileYesterday')}
                active={studiedOn === addDaysIso(today, -1)}
                onPress={() => setStudiedOn(addDaysIso(today, -1))}
                testID="log-session-yesterday"
              />
              <DateField value={studiedOn} onChange={setStudiedOn} min={earliest} max={today} testID="log-session-date" />
            </View>
          </View>

          <View>
            <FieldLabel>{t('StudyCycleMobileMinutes')}</FieldLabel>
            <View className="flex-row flex-wrap items-center gap-2">
              {SESSION_MINUTES.map((value) => (
                <QuickChoice
                  key={value}
                  label={formatStudyMinutes(value)}
                  active={minutes === value}
                  onPress={() => setMinutesText(String(value))}
                  testID={`log-session-minutes-${value}`}
                />
              ))}
              <View className="w-[88px]">
                <Input
                  compact
                  value={minutesText}
                  onChangeText={(text) => setMinutesText(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel={t('StudyCycleMobileMinutes')}
                  testID="log-session-minutes"
                />
              </View>
            </View>
          </View>

          <Input
            compact
            label={t('StudyCycleMobileNote')}
            optional
            value={note}
            onChangeText={setNote}
            maxLength={200}
            placeholder={t('StudyCycleMobileNotePlaceholder')}
            testID="log-session-note"
          />

          {topic && validMinutes ? <CreditPreview cycle={topic.cycle} block={target} minutes={minutes} /> : null}

          <View className="flex-row gap-2">
            <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} disabled={saving} />
            <Button
              text={validMinutes ? t('StudyCycleMobileLogMinutes', { minutes: formatStudyMinutes(minutes) }) : t('StudyCycleMobileLogSession')}
              mode="primary"
              size="auto"
              className="flex-1"
              disabled={!topic || !validMinutes}
              submitting={saving}
              onPress={() => void submit()}
              testID="log-session-save"
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

/** Where the minutes would land: "Goes to block 9 · Concurso TRT", the block, before → after. */
function CreditPreview({ cycle, block, minutes }: { cycle: StudyCycle | null; block: StudyBlock | null; minutes: number }) {
  const { t } = useTranslation();
  if (!cycle || !block) {
    return (
      <View className="rounded-xl bg-surface-2 p-3" testID="log-session-preview">
        <Text className="text-[13px] text-text-2">{t(cycle ? 'StudyCycleMobilePreviewNoBlock' : 'StudyCycleMobilePreviewNoCycle')}</Text>
      </View>
    );
  }
  const before = block.progress.minutes;
  const after = before + minutes;
  return (
    <View className="gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3" testID="log-session-preview">
      <Text className="text-[12px] font-semibold text-accent">
        {t('StudyCycleMobilePreviewBlock', { position: block.position, cycle: cycle.name })}
      </Text>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="min-w-0 flex-1 text-[14px] font-semibold text-text" numberOfLines={1}>
          <RootPrefix root={blockTitleRoot(factsOfBlock(block))} className="text-[12px]" />
          {blockTitle(factsOfBlock(block), t)}
        </Text>
        <Text className="font-mono-semibold text-[12px] text-text" testID="log-session-preview-minutes">
          {t('StudyCycleMobilePreviewMinutes', { before, after, planned: block.plannedMinutes })}
        </Text>
      </View>
      <ProgressBar share={block.plannedMinutes > 0 ? after / block.plannedMinutes : 0} />
    </View>
  );
}

function QuickChoice({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={testID}
      className={`min-h-[42px] justify-center rounded-control border px-3 ${active ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
    >
      <Text className={`text-[13px] font-semibold ${active ? 'text-accent' : 'text-text'}`}>{label}</Text>
    </Pressable>
  );
}
