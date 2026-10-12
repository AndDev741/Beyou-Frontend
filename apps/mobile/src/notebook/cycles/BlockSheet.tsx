import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react-native';
import { blockTitle, factsOfBlock, formatStudyMinutes, subjectLabel } from '@beyou/state';
import type { BlockMode, BlockPatch, GoalSource, StudyBlock } from '@beyou/types/notebook/studyCycle';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import Input from '../../ui/Input';
import SegmentedControl from '../../ui/SegmentedControl';
import SelectField from '../../ui/SelectField';
import FieldLabel from '../../ui/form/FieldLabel';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useSubjectPages } from './useCycleData';

const MIN_PLANNED = 5;
const MAX_PLANNED = 600;
const STEP = 5;

interface BlockSheetProps {
  block: StudyBlock | null;
  onClose: () => void;
  /** Sends the change; resolves true when the server took it, so the sheet can close. */
  onSave: (patch: BlockPatch) => Promise<boolean>;
}

/**
 * One block's own settings, on the cycle screen: what it aims at (time, or a concept to
 * understand), where the concept comes from (the roadmap's next page, or a page chosen here among
 * the subject's own pages), its minutes, whether the page's quiz has to be passed too, and a note.
 *
 * Saving sends every field as the sheet shows it (a PATCH the server reads as the block's new
 * settings), so a block switched to time drops its concept settings in the same request.
 */
export default function BlockSheet({ block, onClose, onSave }: BlockSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [mode, setMode] = useState<BlockMode>('TIME');
  const [goalSource, setGoalSource] = useState<GoalSource>('NEXT');
  const [pageId, setPageId] = useState<string | null>(null);
  const [planned, setPlanned] = useState(60);
  const [plannedText, setPlannedText] = useState('60');
  const [requireQuiz, setRequireQuiz] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const pages = useSubjectPages(block ? block.topic : null);

  useEffect(() => {
    if (!block) return;
    setMode(block.mode);
    setGoalSource(block.goalSource ?? 'NEXT');
    setPageId(block.page?.id ?? null);
    setPlanned(block.plannedMinutes);
    setPlannedText(String(block.plannedMinutes));
    setRequireQuiz(block.requireQuiz);
    setNote(block.note ?? '');
  }, [block]);

  if (!block) return null;

  const setMinutes = (value: number) => {
    const clamped = Math.min(MAX_PLANNED, Math.max(MIN_PLANNED, value));
    setPlanned(clamped);
    setPlannedText(String(clamped));
  };

  const needsPage = mode === 'GOAL' && goalSource === 'PAGE' && !pageId;

  const save = async () => {
    if (needsPage || saving) return;
    setSaving(true);
    const goal = mode === 'GOAL';
    const saved = await onSave({
      mode,
      plannedMinutes: planned,
      goalSource: goal ? goalSource : null,
      // A time block may keep a page as a hint; a concept from the roadmap carries none.
      pageId: goal && goalSource === 'NEXT' ? null : pageId,
      requireQuiz: goal ? requireQuiz : false,
      note: note.trim() || null,
    });
    setSaving(false);
    if (saved) onClose();
  };

  const pageOptions = pages.map((page) => ({ value: page.id, label: `${'  '.repeat(page.depth)}${page.title}` }));

  return (
    <BottomSheet visible onClose={onClose} closeLabel="Close" dismissable={!saving}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" testID="block-sheet">
        <View className="gap-3.5 pb-1">
          <View className="gap-0.5">
            <Text className="text-[12px] font-semibold text-text-3">
              {t('StudyCycleMobileBlockNumber', { position: block.position, topic: subjectLabel(block.topic) })}
            </Text>
            <Text accessibilityRole="header" className="text-[17px] font-semibold text-text">
              {blockTitle(factsOfBlock(block), t)}
            </Text>
          </View>

          <View>
            <FieldLabel>{t('StudyCycleMobileGoalOfBlock')}</FieldLabel>
            <SegmentedControl<BlockMode>
              label={t('StudyCycleMobileGoalOfBlock')}
              options={[
                { value: 'TIME', label: t('StudyCycleMobileModeTime'), description: t('StudyCycleMobileModeTimeHint') },
                { value: 'GOAL', label: t('StudyCycleMobileModeGoal'), description: t('StudyCycleMobileModeGoalHint') },
              ]}
              value={mode}
              onChange={setMode}
              testID="block-mode"
            />
          </View>

          {mode === 'GOAL' ? (
            <View>
              <FieldLabel>{t('StudyCycleMobileConcept')}</FieldLabel>
              <SegmentedControl<GoalSource>
                label={t('StudyCycleMobileConcept')}
                options={[
                  { value: 'NEXT', label: t('StudyCycleMobileSourceNextOption') },
                  { value: 'PAGE', label: t('StudyCycleMobileSourcePageOption') },
                ]}
                value={goalSource}
                onChange={setGoalSource}
                testID="block-source"
              />
            </View>
          ) : null}

          {mode === 'GOAL' && goalSource === 'PAGE' ? (
            <View>
              <FieldLabel required>{t('StudyCycleMobilePage')}</FieldLabel>
              <SelectField
                label={t('StudyCycleMobilePage')}
                value={pageId ?? ''}
                options={[{ value: '', label: t('StudyCycleMobilePickPage') }, ...pageOptions]}
                onChange={(value) => setPageId(value || null)}
                testID="block-page"
              />
            </View>
          ) : null}

          <View>
            <FieldLabel>{mode === 'GOAL' ? t('StudyCycleMobileEstimate') : t('StudyCycleMobilePlanned')}</FieldLabel>
            <View className="flex-row items-center gap-2">
              <IconButton label={t('StudyCycleMobileLess')} onPress={() => setMinutes(planned - STEP)} testID="block-minutes-less">
                <Minus size={18} color={theme.text2} />
              </IconButton>
              <View className="w-[88px]">
                <Input
                  compact
                  value={plannedText}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, '');
                    setPlannedText(digits);
                    const value = Number.parseInt(digits, 10);
                    if (value >= MIN_PLANNED && value <= MAX_PLANNED) setPlanned(value);
                  }}
                  onEndEditing={() => setPlannedText(String(planned))}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel={t('StudyCycleMobilePlanned')}
                  testID="block-minutes"
                />
              </View>
              <IconButton label={t('StudyCycleMobileMore')} onPress={() => setMinutes(planned + STEP)} testID="block-minutes-more">
                <Plus size={18} color={theme.text2} />
              </IconButton>
              <Text className="text-[13px] text-text-2">{formatStudyMinutes(planned)}</Text>
            </View>
            {mode === 'GOAL' ? <Text className="mt-1 text-[12px] text-text-3">{t('StudyCycleMobileEstimateHint')}</Text> : null}
          </View>

          {mode === 'GOAL' ? (
            <View className="flex-row items-center justify-between gap-3 rounded-control border border-border bg-surface px-3 py-2">
              <View className="min-w-0 flex-1">
                <Text className="text-[13.5px] font-semibold text-text">{t('StudyCycleMobileRequireQuiz')}</Text>
                <Text className="text-[12px] text-text-2">{t('StudyCycleMobileRequireQuizHint')}</Text>
              </View>
              <Switch
                value={requireQuiz}
                onValueChange={setRequireQuiz}
                trackColor={{ true: theme.accent, false: theme.border }}
                thumbColor={theme.surface}
                accessibilityLabel={t('StudyCycleMobileRequireQuiz')}
                testID="block-quiz"
              />
            </View>
          ) : null}

          <Input
            compact
            label={t('StudyCycleMobileNote')}
            optional
            value={note}
            onChangeText={setNote}
            maxLength={200}
            placeholder={t('StudyCycleMobileBlockNotePlaceholder')}
            testID="block-note"
          />

          {needsPage ? <Text className="text-[12px] text-text-2">{t('StudyCycleMobilePickPageFirst')}</Text> : null}

          <View className="flex-row gap-2">
            <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} disabled={saving} />
            <Button
              text={t('Save')}
              mode="primary"
              size="auto"
              className="flex-1"
              disabled={needsPage}
              submitting={saving}
              onPress={() => void save()}
              testID="block-save"
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
