import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowUpDown, Ellipsis, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { pathLevels, progressShare } from '@beyou/state';
import type { Board, BoardNode } from '@beyou/types/notebook/notebook';
import ProgressBar from './ProgressBar';
import StatusMark, { STATUS_LABEL_KEY } from './StatusMark';
import { useBeyouTheme } from '../theme/ThemeProvider';

/**
 * A board read as a path, level by level (`pathLevels`): every node after the nodes that point to
 * it, with "Then, in any order" over a level that has more than one node. The node being studied
 * is drawn as a card with its progress; the line below a finished node is filled.
 *
 * The "⋯" on a row opens the node's sheet; below the path a node is added after the last one, and
 * the path can be put in another order.
 */
export default function PathView({
  board,
  onOpen,
  onActions,
  onAdd,
  onReorder,
}: {
  board: Board;
  onOpen: (node: BoardNode) => void;
  onActions: (node: BoardNode) => void;
  /** A node after `last`, the end of the path as it reads. */
  onAdd: (last: BoardNode | null) => void;
  onReorder: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const levels = useMemo(() => pathLevels(board), [board]);
  const flat = levels.flatMap((level, index) => level.map((node) => ({ node, levelIndex: index, levelSize: level.length })));

  return (
    <View testID="notebook-path">
      {flat.map(({ node, levelIndex, levelSize }, i) => {
        const firstOfLevel = i === 0 || flat[i - 1].levelIndex !== levelIndex;
        const last = i === flat.length - 1;
        return (
          <View key={node.id}>
            {firstOfLevel && levelSize > 1 ? (
              <View className="flex-row gap-3">
                <View className="w-8 items-center">
                  {i > 0 ? <View className="w-0.5 flex-1 bg-border" /> : null}
                </View>
                <Text className="flex-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[1px] text-text-3">
                  {t('NotebookMobileAnyOrder')}
                </Text>
              </View>
            ) : null}
            <PathRow node={node} last={last} onOpen={() => onOpen(node)} onActions={() => onActions(node)} />
          </View>
        );
      })}
      <View className="mt-1 gap-2">
        <Pressable
          onPress={() => onAdd(flat.length > 0 ? flat[flat.length - 1].node : null)}
          accessibilityRole="button"
          className="h-12 flex-row items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border"
          testID="notebook-path-add"
        >
          <Plus size={16} color={theme.text2} />
          <Text className="text-[14px] font-semibold text-text-2">{t('NotebookMobileAddNode')}</Text>
        </Pressable>
        {flat.length > 1 ? (
          <Pressable
            onPress={onReorder}
            accessibilityRole="button"
            className="h-11 flex-row items-center justify-center gap-2"
            testID="notebook-path-reorder"
          >
            <ArrowUpDown size={16} color={theme.text2} />
            <Text className="text-[14px] font-semibold text-text-2">{t('NotebookMobileReorder')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PathRow({
  node,
  last,
  onOpen,
  onActions,
}: {
  node: BoardNode;
  last: boolean;
  onOpen: () => void;
  onActions: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const studying = node.status === 'STUDYING';
  const sub = node.linked && node.homeTopicTitle
    ? t('NotebookMobileLinkedFrom', { topic: node.homeTopicTitle })
    : node.hasBoard && node.progress
      ? t('NotebookMobileSubtopicsDone', { done: node.progress.done, total: node.progress.total })
      : t(STATUS_LABEL_KEY[node.status]);

  return (
    <View className="flex-row gap-3">
      <View className="w-8 items-center">
        <View className="h-8 w-8 items-center justify-center">
          <StatusMark status={node.status} size={studying ? 26 : 22} />
        </View>
        {!last ? <View className={`w-0.5 flex-1 ${node.status === 'DONE' ? 'bg-accent' : 'bg-border'}`} /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${node.title}, ${t(STATUS_LABEL_KEY[node.status])}`}
        onPress={onOpen}
        testID="notebook-path-row"
        className={`mb-3 min-h-11 flex-1 justify-center ${
          studying ? 'gap-2 rounded-card border-[1.5px] border-accent bg-surface px-3 py-2.5' : 'py-1'
        }`}
      >
        <Text className="text-[15px] font-semibold text-text" numberOfLines={2}>
          {node.title}
        </Text>
        {studying && node.progress && node.hasBoard ? <ProgressBar share={progressShare(node.progress)} /> : null}
        <Text className="text-[13px] text-text-2" numberOfLines={1}>
          {sub}
        </Text>
      </Pressable>
      <Pressable
        onPress={onActions}
        accessibilityRole="button"
        accessibilityLabel={t('NotebookMobileNodeActions', { title: node.title })}
        className="mb-3 h-11 w-10 items-center justify-center self-center"
        testID="notebook-path-actions"
      >
        <Ellipsis size={18} color={theme.text2} />
      </Pressable>
    </View>
  );
}
