import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { addBoardNode, reorderBoard } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterBoard, notebookStatusesChanged, pathLevels } from '@beyou/state';
import type { Board, BoardNode } from '@beyou/types/notebook/notebook';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';

/**
 * A new node: a new page under this one, on the board's next free cell (the server picks it),
 * after `after` on the path when there is one. The page's document gets its board block too,
 * so the web shows the board the phone just started.
 */
export function AddNodeSheet({
  boardPageId,
  after,
  visible,
  onClose,
  onAdded,
}: {
  boardPageId: string;
  /** The node the new one follows; null for a board's first node. */
  after: BoardNode | null;
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setTitle('');
  }, [visible]);

  const add = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    const response = await addBoardNode(boardPageId, { title: name, after: after?.id }, t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    dispatch(notebookStatusesChanged(response.success.changed));
    onClose();
    onAdded();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" testID="add-node-sheet">
        <View className="gap-1">
          <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
            {t('NotebookMobileAddNode')}
          </Text>
          {after ? (
            <Text className="text-[13px] text-text-2" numberOfLines={1}>
              {t('NotebookMobileAddsAfter', { title: after.title })}
            </Text>
          ) : null}
        </View>
        <Input
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={255}
          placeholder={t('NotebookBoardNodePlaceholder')}
          accessibilityLabel={t('NotebookPageTitle')}
          returnKeyType="done"
          onSubmitEditing={() => void add()}
          testID="add-node-title"
        />
        <Button
          text={t('NotebookMobileAddNode')}
          mode="primary"
          size="block"
          submitting={busy}
          disabled={!title.trim()}
          onPress={() => void add()}
          testID="add-node-submit"
        />
      </View>
    </BottomSheet>
  );
}

/**
 * The page nodes in the order the path reads, moved with arrows, saved as one path. A board
 * drawn on the web with branches turns into a line, so the sheet says so before it saves.
 */
export function ReorderSheet({
  board,
  visible,
  onClose,
}: {
  board: Board;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const levels = useMemo(() => pathLevels(board), [board]);
  const [order, setOrder] = useState<BoardNode[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setOrder(levels.flat());
  }, [visible, levels]);

  const branched = levels.some((level) => level.length > 1);

  const move = (index: number, by: -1 | 1) =>
    setOrder((current) => {
      const next = [...current];
      const [node] = next.splice(index, 1);
      next.splice(index + by, 0, node);
      return next;
    });

  const save = async () => {
    setBusy(true);
    const response = await reorderBoard(board.pageId, order.map((node) => node.id), t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    dispatch(enterBoard(response.success));
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" style={{ flexShrink: 1 }} testID="reorder-sheet">
        <View className="gap-1">
          <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
            {t('NotebookMobileReorder')}
          </Text>
          <Text className="text-[13px] leading-[18px] text-text-2">
            {t('NotebookMobileReorderHint')}
            {branched ? ` ${t('NotebookMobileReorderBranches')}` : ''}
          </Text>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 6 }}>
          {order.map((node, index) => (
            <View key={node.id} className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-surface pl-3" testID="reorder-row">
              <Text className="w-6 font-mono text-[12px] text-text-3">{index + 1}</Text>
              <Text className="flex-1 text-[15px] text-text" numberOfLines={1}>{node.title}</Text>
              <Pressable
                onPress={() => move(index, -1)}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={t('NotebookMobileMoveUp', { title: node.title })}
                className="h-11 w-11 items-center justify-center"
                testID="reorder-up"
              >
                <ArrowUp size={18} color={index === 0 ? theme.text3 : theme.text} />
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                disabled={index === order.length - 1}
                accessibilityRole="button"
                accessibilityLabel={t('NotebookMobileMoveDown', { title: node.title })}
                className="h-11 w-11 items-center justify-center"
                testID="reorder-down"
              >
                <ArrowDown size={18} color={index === order.length - 1 ? theme.text3 : theme.text} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <Button text={t('NotebookSave')} mode="primary" size="block" submitting={busy} onPress={() => void save()} testID="reorder-save" />
      </View>
    </BottomSheet>
  );
}
