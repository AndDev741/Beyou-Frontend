import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { FileText, Link2, Minus, Plus, X } from 'lucide-react-native';
import { addBoardEdge, deleteBoardEdge, deleteBoardNode, updatePage } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
  enterBoardEdge,
  notebookPageDetailsChanged,
  notebookStatusesChanged,
  prerequisitesOf,
  removeBoardEdge,
  removeBoardNode,
  removeNotebookPage,
} from '@beyou/state';
import type { Board, BoardNode, NotebookStatus } from '@beyou/types/notebook/notebook';
import BottomSheet from '../../ui/BottomSheet';
import BeyouIcon from '../../ui/BeyouIcon';
import Button from '../../ui/Button';
import DeleteModal from '../../ui/DeleteModal';
import SegmentedControl from '../../ui/SegmentedControl';
import IconPicker from '../../ui/icons/IconPicker';
import { STATUS_LABEL_KEY } from '../StatusMark';
import { useStatusChange } from '../useStatusChange';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';

type Step = 'main' | 'icon' | 'delete' | null;

/**
 * One node of a roadmap, from the "⋯" on its row: its title and icon (its page's), its status,
 * the nodes it comes after, and what can be done with it. The same changes the web's node
 * inspector makes, through the same endpoints.
 *
 * Taking a node off the roadmap keeps its page under this one. Deleting takes the page and its
 * notes, so it asks first; a node that links a page from another topic only comes off.
 */
export default function NodeSheet({
  board,
  node,
  onClose,
  onChanged,
  onOpen,
  onAddAfter,
}: {
  board: Board;
  node: BoardNode | null;
  onClose: () => void;
  /** Something moved on the board: the screen reads the board and the page again. */
  onChanged: () => void;
  onOpen: (node: BoardNode) => void;
  onAddAfter: (node: BoardNode) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const setStatus = useStatusChange();
  const [step, setStep] = useState<Step>(null);
  const [title, setTitle] = useState('');
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStep(node ? 'main' : null);
    setTitle(node?.title ?? '');
    setLinking(false);
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node || !node.pageId) return null;
  const pageId = node.pageId;
  const before = prerequisitesOf(board, node.id);
  const linkable = board.nodes.filter(
    (other) => other.kind === 'PAGE' && other.id !== node.id && !before.some((b) => b.id === other.id),
  );

  const close = () => {
    setStep(null);
    onClose();
  };

  const saveDetails = async (patch: { title?: string; icon?: string }) => {
    const response = await updatePage(pageId, patch, t);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      setTitle(node.title);
      return;
    }
    const { id, title: saved, icon } = response.success;
    dispatch(notebookPageDetailsChanged({ pageId: id, title: saved, icon }));
  };

  const rename = () => {
    const next = title.trim();
    if (!next || next === node.title) {
      setTitle(node.title);
      return;
    }
    void saveDetails({ title: next });
  };

  const unlink = async (from: BoardNode) => {
    const edge = board.edges.find((e) => e.source === from.id && e.target === node.id);
    if (!edge) return;
    const response = await deleteBoardEdge(edge.id, t);
    if (response.error) return notify.error(getFriendlyErrorMessage(t, response.error));
    dispatch(removeBoardEdge({ pageId: board.pageId, edgeId: edge.id }));
  };

  const link = async (from: BoardNode) => {
    setLinking(false);
    const response = await addBoardEdge(board.pageId, from.id, node.id, t);
    if (!response.success) return notify.error(getFriendlyErrorMessage(t, response.error));
    dispatch(enterBoardEdge({ pageId: board.pageId, edge: response.success }));
  };

  const remove = async (deletePage: boolean) => {
    setBusy(true);
    const response = await deleteBoardNode(node.id, deletePage, t);
    setBusy(false);
    if (!response.success) return notify.error(getFriendlyErrorMessage(t, response.error));
    dispatch(removeBoardNode({ pageId: board.pageId, nodeId: node.id }));
    if (deletePage && !node.linked) dispatch(removeNotebookPage(pageId));
    dispatch(notebookStatusesChanged(response.success.changed));
    close();
    onChanged();
  };

  return (
    <>
      <BottomSheet visible={step === 'main'} onClose={close}>
        <View className="gap-4" testID="node-sheet">
          <View className="gap-1.5">
            <Text className="font-mono text-[11px] tracking-wide text-text-2">{t('NotebookMobileNodeSheetTitle').toUpperCase()}</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setStep('icon')}
                accessibilityRole="button"
                accessibilityLabel={t('NotebookIconTitle')}
                className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg"
                testID="node-icon"
              >
                {node.icon ? <BeyouIcon id={node.icon} size={20} color={theme.accent} /> : <FileText size={20} color={theme.accent} />}
              </Pressable>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onEndEditing={rename}
                returnKeyType="done"
                maxLength={255}
                accessibilityLabel={t('NotebookPageTitle')}
                className="h-12 flex-1 rounded-xl border border-border bg-surface px-3 font-semibold text-[16px] text-text"
                testID="node-title"
              />
            </View>
          </View>

          <SegmentedControl<NotebookStatus>
            label={t('NotebookMobileStatus')}
            options={(['TO_STUDY', 'STUDYING', 'DONE'] as NotebookStatus[]).map((status) => ({
              value: status,
              label: t(STATUS_LABEL_KEY[status]),
            }))}
            value={node.status}
            onChange={(status) => void setStatus(pageId, status).then((change) => change && onChanged())}
            testID="node-status"
          />

          <View className="gap-2">
            <Text className="font-mono text-[11px] tracking-wide text-text-2">{t('NotebookMobileComesAfter').toUpperCase()}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {before.map((from) => (
                <View key={from.id} className="h-[34px] flex-row items-center rounded-full bg-accent-soft pl-3 pr-1">
                  <Text className="text-[13px] font-semibold text-accent" numberOfLines={1}>{from.title}</Text>
                  <Pressable
                    onPress={() => void unlink(from)}
                    accessibilityRole="button"
                    accessibilityLabel={t('NotebookMobileUnlink', { title: from.title })}
                    className="h-8 w-8 items-center justify-center"
                    testID="node-unlink"
                  >
                    <X size={13} color={theme.accent} />
                  </Pressable>
                </View>
              ))}
              {linkable.length > 0 ? (
                <Pressable
                  onPress={() => setLinking((open) => !open)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: linking }}
                  className="h-[34px] flex-row items-center gap-1 rounded-full border border-dashed border-border px-3"
                  testID="node-link"
                >
                  <Link2 size={13} color={theme.text2} />
                  <Text className="text-[13px] font-semibold text-text-2">{t('NotebookMobileLinkNode')}</Text>
                </Pressable>
              ) : null}
            </View>
            {linking ? (
              <View className="gap-1 rounded-xl border border-border p-1" testID="node-link-choices">
                {linkable.map((other) => (
                  <Pressable
                    key={other.id}
                    onPress={() => void link(other)}
                    accessibilityRole="button"
                    className="min-h-11 justify-center rounded-lg px-3 active:bg-surface-2"
                    testID="node-link-choice"
                  >
                    <Text className="text-[14px] text-text" numberOfLines={1}>{other.title}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View className="overflow-hidden rounded-[14px] border border-border">
            <Row Icon={FileText} label={t('NotebookMobileOpenPage')} onPress={() => { close(); onOpen(node); }} testID="node-open" />
            <Row Icon={Plus} label={t('NotebookMobileAddAfter')} onPress={() => { close(); onAddAfter(node); }} testID="node-add-after" />
            <Row
              Icon={Minus}
              label={t('NotebookMobileRemoveFromRoadmap')}
              hint={node.linked ? undefined : t('NotebookMobilePageStays')}
              onPress={() => void remove(false)}
              disabled={busy}
              last
              testID="node-remove"
            />
          </View>

          {node.linked ? null : (
            <Button text={t('NotebookMobileDeleteNodePage')} mode="danger" size="block" onPress={() => setStep('delete')} testID="node-delete" />
          )}
        </View>
      </BottomSheet>

      <IconPicker
        visible={step === 'icon'}
        selectedIcon={node.icon}
        onSelect={(icon) => {
          setStep('main');
          void saveDetails({ icon });
        }}
        onClose={() => setStep('main')}
      />

      <DeleteModal
        visible={step === 'delete'}
        deletePhrase={t('NotebookDeleteTitle', { title: node.title })}
        name={node.title}
        detail={t('NotebookDeleteExplain')}
        pending={busy}
        onCancel={() => setStep('main')}
        onConfirm={() => void remove(true)}
        testID="node-delete-modal"
      />
    </>
  );
}

function Row({
  Icon,
  label,
  hint,
  onPress,
  disabled = false,
  last = false,
  testID,
}: {
  Icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
  testID?: string;
}) {
  const { theme } = useBeyouTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`min-h-[50px] flex-row items-center gap-3 bg-surface px-3.5 active:bg-surface-2 ${last ? '' : 'border-b border-border'}`}
      testID={testID}
    >
      <Icon size={18} color={theme.text2} />
      <Text className="text-[15px] text-text">
        {label}
        {hint ? <Text className="text-[13px] text-text-3">{` · ${hint}`}</Text> : null}
      </Text>
    </Pressable>
  );
}
