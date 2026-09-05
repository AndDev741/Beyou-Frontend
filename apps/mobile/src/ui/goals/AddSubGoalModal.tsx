import { useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GitBranch, Plus, X } from 'lucide-react-native';
import type { goal } from '@beyou/types/goals/goalType';
import { MAX_GOAL_DEPTH, ancestorsOf, depthOf, subtreeHeight } from '@beyou/state';
import moveGoalUnder from '@beyou/api/goals/moveGoalUnder';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import XpBar from '../XpBar';
import { ModalToastHost } from '../BeyouToast';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface AddSubGoalModalProps {
  /** The goal that gets a sub-goal; null keeps the modal closed. */
  parent: goal | null;
  allGoals: goal[];
  onClose: () => void;
  /** "Create a new sub-goal": the caller opens the goal form with the parent preset. */
  onCreateNew: (parent: goal) => void;
  /** After a move landed, so the list refetches. */
  onMoved: () => void;
  testID?: string;
}

/**
 * The step between "Add sub-goal" and a form.
 *
 * Tapping a branch icon on a card and landing in the create form with a parent already
 * picked was the whole explanation a person got, and on a phone that reads as "why did a
 * form open". This says what is about to happen, in words, and offers the two ways to do
 * it: move a goal that already exists under this one, or create a new one. Only then does
 * the form open.
 *
 * The candidates are the same list the server would accept, filtered here so the modal
 * never offers what the save would refuse: not the goal itself, not already its child,
 * not one of its ancestors (that is the cycle), and short enough that the chain still
 * fits in three levels with whatever hangs under the candidate.
 */
export default function AddSubGoalModal({
  parent,
  allGoals,
  onClose,
  onCreateNew,
  onMoved,
  testID = 'add-subgoal-modal',
}: AddSubGoalModalProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [movingId, setMovingId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!parent) return [];
    const ancestorIds = new Set(ancestorsOf(allGoals, parent.id).map((g) => g.id));
    const parentDepth = depthOf(allGoals, parent.id);
    return allGoals
      .filter((g) => g.id !== parent.id && g.parentId !== parent.id && !ancestorIds.has(g.id))
      .filter((g) => parentDepth + 1 + subtreeHeight(allGoals, g.id) <= MAX_GOAL_DEPTH)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [allGoals, parent]);

  if (!parent) return null;

  const move = async (candidate: goal) => {
    setMovingId(candidate.id);
    const res = await moveGoalUnder(candidate, parent.id, t);
    setMovingId(null);
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(t('SubGoalMoved', { name: candidate.name, parent: parent.name }));
    onMoved();
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
          onPress={onClose}
          testID={`${testID}-backdrop`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="w-full max-w-[420px] rounded-card border border-border bg-surface p-5" testID={testID}>
          <View className="flex-row items-center gap-2">
            <GitBranch size={16} color={theme.accent} />
            <Text accessibilityRole="header" className="flex-1 text-[15px] font-semibold tracking-[-0.01em] text-text">
              {t('AddSubGoal')}
            </Text>
            <IconButton label={t('Close')} onPress={onClose} testID={`${testID}-close`}>
              <X size={16} color={theme.text3} />
            </IconButton>
          </View>
          <Text className="mt-1.5 text-[12.5px] leading-snug text-text-2">
            {t('AddSubGoalExplain', { name: parent.name })}
          </Text>

          <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1px] text-text-3">
            {t('MoveExistingGoalHere')}
          </Text>
          {candidates.length === 0 ? (
            <Text className="mt-2 text-[12.5px] text-text-3" testID={`${testID}-none`}>
              {t('NoGoalFitsHere')}
            </Text>
          ) : (
            <ScrollView className="mt-2 max-h-56" keyboardShouldPersistTaps="handled">
              <View className="gap-1.5">
                {candidates.map((candidate) => (
                  <Pressable
                    key={candidate.id}
                    onPress={() => void move(candidate)}
                    disabled={movingId !== null}
                    accessibilityRole="button"
                    accessibilityLabel={candidate.name}
                    testID={`${testID}-pick-${candidate.id}`}
                    className={`flex-row items-center gap-2.5 rounded-control border border-border px-3 py-2 active:bg-surface-2 ${
                      movingId === candidate.id ? 'opacity-60' : ''
                    }`}
                  >
                    <IconTile size={28}>
                      <BeyouIcon id={candidate.iconId} size={14} showFallback />
                    </IconTile>
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-[13px] font-semibold text-text" numberOfLines={1}>
                        {candidate.name}
                      </Text>
                      <XpBar current={candidate.currentValue} target={candidate.targetValue} compact />
                    </View>
                    <Text className="shrink-0 font-mono text-[11px] text-text-3">
                      {`${candidate.currentValue}/${candidate.targetValue}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          <View className="mt-4 flex-row justify-end gap-2">
            <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} testID={`${testID}-cancel`} />
            <Button
              text={t('CreateNewSubGoal')}
              mode="primary"
              size="auto"
              icon={<Plus size={14} color={theme.onAccent} />}
              onPress={() => onCreateNew(parent)}
              testID={`${testID}-create`}
            />
          </View>
        </View>
      </View>
      {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
      <ModalToastHost />
    </Modal>
  );
}
