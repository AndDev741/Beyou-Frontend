import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Ellipsis, FileText, PenLine, Timer, Workflow } from 'lucide-react-native';
import { getBoard, getPage, getTopicTree } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterBoard, enterNotebookPage, enterNotebookTree, progressShare } from '@beyou/state';
import type { BoardNode, NotebookStatus, StatusChoice } from '@beyou/types/notebook/notebook';
import Button from '../../../src/ui/Button';
import Card from '../../../src/ui/Card';
import Chip from '../../../src/ui/Chip';
import Ring from '../../../src/ui/Ring';
import IconTile from '../../../src/ui/IconTile';
import BeyouIcon from '../../../src/ui/BeyouIcon';
import SegmentedControl from '../../../src/ui/SegmentedControl';
import BlockRenderer from '../../../src/notebook/BlockRenderer';
import PathView from '../../../src/notebook/PathView';
import PageActions from '../../../src/notebook/PageActions';
import NodeSheet from '../../../src/notebook/trail/NodeSheet';
import { AddNodeSheet, ReorderSheet } from '../../../src/notebook/trail/TrailSheets';
import EmptyState from '../../../src/ui/EmptyState';
import { STATUS_LABEL_KEY } from '../../../src/notebook/StatusMark';
import { useNotebookFocus } from '../../../src/notebook/useNotebookFocus';
import { useStatusChange } from '../../../src/notebook/useStatusChange';
import { notify } from '../../../src/notify';
import { useBeyouTheme } from '../../../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../../../src/store';

type Tab = 'path' | 'notes';

/**
 * One topic or page on a phone: its roadmap read as a path, its notes, and its status.
 *
 * The board a page holds is shown as levels (`pathLevels`): every node after the nodes that point
 * to it, with "Then, in any order" over a level that has more than one. A canvas you pan with one
 * thumb is not a way to read a roadmap; a list in study order is. Tapping a node opens its page on
 * this same screen, pushed, so back walks up the tree.
 */
export default function NotebookPageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const page = useSelector((s: RootState) => (id ? s.notebook.pages[id] : undefined));
  const board = useSelector((s: RootState) => (id ? s.notebook.boards[id] : undefined));
  const tree = useSelector((s: RootState) => {
    const topicId = page?.topicId ?? page?.id;
    return topicId ? s.notebook.trees[topicId] : undefined;
  });
  const [loading, setLoading] = useState(!page);
  const [failed, setFailed] = useState(false);
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  // The trail's sheets: a node's actions (by id, so it follows the board as it changes), a new
  // node and where it goes, the reorder.
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ after: BoardNode | null } | null>(null);
  const [reordering, setReordering] = useState(false);
  const startFocus = useNotebookFocus();
  const setStatus = useStatusChange();

  const load = useCallback(async () => {
    if (!id) return;
    const [pageResponse, boardResponse] = await Promise.all([getPage(id, t), getBoard(id, t)]);
    setLoading(false);
    if (pageResponse.success) dispatch(enterNotebookPage(pageResponse.success));
    if (boardResponse.success) dispatch(enterBoard(boardResponse.success));
    // The tree, for the pages under this one that are not on its board: the phone has no sidebar,
    // so a page added with "Add a page" would have no way back to it otherwise.
    const topicId = pageResponse.success ? pageResponse.success.topicId ?? pageResponse.success.id : null;
    if (topicId) {
      const treeResponse = await getTopicTree(topicId, t);
      if (treeResponse.success) dispatch(enterNotebookTree(treeResponse.success));
    }
    if (pageResponse.error) {
      setFailed(true);
      notify.error(getFriendlyErrorMessage(t, pageResponse.error));
    }
  }, [dispatch, id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const hasPath = !!board && board.nodes.some((node) => node.kind === 'PAGE');
  const offBoard = (tree?.items ?? [])
    .filter((item) => item.parentId === id && !item.onBoard)
    .sort((a, b) => a.position - b.position);
  const tab: Tab = chosenTab ?? (hasPath ? 'path' : 'notes');

  const changeStatus = async (choice: StatusChoice) => {
    if (!page || savingStatus) return;
    setSavingStatus(true);
    const change = await setStatus(page.id, choice);
    setSavingStatus(false);
    if (change) dispatch(enterNotebookPage({ ...page, status: change.status, statusManual: change.statusManual }));
  };

  const focus = () => {
    if (!page) return;
    const started = startFocus({ id: page.id, title: page.title }, page.habit?.id);
    if (started) notify.info(t('NotebookMobileFocusStarted'));
    else notify.info(t('NotebookMobileFocusAlreadyRunning'));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notebook'));
  const openEditor = () => {
    if (page) router.push({ pathname: '/notebook-editor', params: { id: page.id } });
  };

  if (loading || !page) {
    return (
      <View className="flex-1 items-center justify-center bg-bg" testID="notebook-page-loading">
        {failed ? (
          <View className="items-center gap-3 px-8">
            <Text className="text-center text-[15px] text-text-2">{t('NotebookMobilePageMissing')}</Text>
            <Button text={t('NotebookMobileBack')} mode="tonal" size="auto" onPress={goBack} />
          </View>
        ) : (
          <ActivityIndicator color={theme.accent} />
        )}
      </View>
    );
  }

  const topicTitle = page.breadcrumb.length > 1 ? page.breadcrumb[0].title : null;
  const percent = Math.round(progressShare(page.progress) * 100);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }} testID="notebook-page">
      <View className="flex-row items-center gap-1 px-2 pb-2">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookMobileBack')}
          className="h-11 w-11 items-center justify-center"
          testID="back-button"
        >
          <ChevronLeft size={24} color={theme.text2} />
        </Pressable>
        <Text className="flex-1 text-[13px] text-text-2" numberOfLines={1}>
          {topicTitle ?? t('Notebook')}
        </Text>
        <Pressable
          onPress={() => setActionsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookMoreActions')}
          className="h-11 w-11 items-center justify-center"
          testID="page-actions-open"
        >
          <Ellipsis size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}>
        <View className="flex-row items-center gap-3">
          {page.icon ? (
            <IconTile size={44}>
              <BeyouIcon id={page.icon} size={22} color={theme.accent} />
            </IconTile>
          ) : null}
          <Text accessibilityRole="header" className="flex-1 text-[26px] font-bold leading-[32px] text-text" testID="notebook-page-title">
            {page.title}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Ring size={44} state="progress" progress={progressShare(page.progress)} label={`${percent}%`} />
          <View className="min-w-0 flex-1">
            <Text className="text-[14px] font-semibold text-text">
              {t('NotebookMobileSubtopicsDone', { done: page.progress.done, total: page.progress.total })}
            </Text>
            {page.focusMinutes > 0 ? (
              <Text className="text-[12.5px] text-text-2">
                {t('NotebookMobileFocused', { minutes: page.focusMinutes })}
              </Text>
            ) : null}
          </View>
          {page.cardsDue > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/notebook-review', params: { scope: page.id } })}
              className="min-h-11 justify-center"
              testID="notebook-page-due"
            >
              <Chip variant="flame">{t('NotebookMobileDueShort', { count: page.cardsDue })}</Chip>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-2">
          <SegmentedControl<NotebookStatus>
            label={t('NotebookMobileStatus')}
            options={(['TO_STUDY', 'STUDYING', 'DONE'] as NotebookStatus[]).map((status) => ({
              value: status,
              label: t(STATUS_LABEL_KEY[status]),
            }))}
            value={page.status}
            onChange={(status) => void changeStatus(status)}
            testID="notebook-page-status"
          />
          {page.hasBoard && page.statusManual ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void changeStatus('AUTO')}
              className="min-h-11 justify-center"
              testID="notebook-page-status-auto"
            >
              <Text className="text-[13px] font-semibold text-accent">{t('NotebookMobileFollowNodes')}</Text>
            </Pressable>
          ) : null}
        </View>

        <Button
          text={t('NotebookMobileFocus')}
          mode="default"
          size="block"
          icon={<Timer size={16} color={theme.text} />}
          onPress={focus}
          testID="notebook-page-focus"
        />

        <SegmentedControl<Tab>
          label={t('NotebookMobileView')}
          options={[
            { value: 'path', label: t('NotebookMobilePath') },
            { value: 'notes', label: t('NotebookMobileNotes') },
          ]}
          value={tab}
          onChange={setChosenTab}
          testID="notebook-page-tab"
        />

        {tab === 'path' && board && hasPath ? (
          <PathView
            board={board}
            onOpen={(node) => node.pageId && router.push(`/notebook/${node.pageId}`)}
            onActions={(node) => setActingOn(node.id)}
            onAdd={(last) => setAdding({ after: last })}
            onReorder={() => setReordering(true)}
          />
        ) : tab === 'path' ? (
          <EmptyState
            icon={<Workflow size={22} color={theme.accent} />}
            title={t('NotebookMobilePathEmptyTitle')}
            description={t('NotebookMobilePathEmptyBody')}
            actionLabel={t('NotebookMobileAddNode')}
            onAction={() => setAdding({ after: null })}
            testID="notebook-path-empty"
          />
        ) : (
          <View className="gap-3">
            <Button
              text={t('NotebookMobileEditNotes')}
              mode="tonal"
              size="block"
              icon={<PenLine size={16} color={theme.accent} />}
              onPress={openEditor}
              testID="notebook-page-edit"
            />
            <Pressable onPress={openEditor} accessibilityRole="button" accessibilityLabel={t('NotebookMobileEditNotes')}>
              <Card testID="notebook-page-notes">
                <BlockRenderer content={page.content} cardsTotal={page.cardsTotal} />
              </Card>
            </Pressable>
          </View>
        )}
        {offBoard.length > 0 ? (
          <View className="gap-2" testID="notebook-page-subpages">
            <Text className="mt-2 text-[15px] font-semibold text-text">{t('NotebookMobileSubpages')}</Text>
            {offBoard.map((item) => (
              <Card key={item.id} onPress={() => router.push(`/notebook/${item.id}`)} interactive testID="notebook-subpage">
                <View className="flex-row items-center gap-3">
                  <IconTile size={36}>
                    {item.icon ? <BeyouIcon id={item.icon} size={18} color={theme.accent} /> : <FileText size={18} color={theme.accent} />}
                  </IconTile>
                  <Text className="flex-1 text-[15px] font-semibold text-text" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <ChevronRight size={18} color={theme.text3} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <PageActions page={page} open={actionsOpen} onClose={() => setActionsOpen(false)} />
      {board ? (
        <>
          <NodeSheet
            board={board}
            node={board.nodes.find((node) => node.id === actingOn) ?? null}
            onClose={() => setActingOn(null)}
            onChanged={() => void load()}
            onOpen={(node) => node.pageId && router.push(`/notebook/${node.pageId}`)}
            onAddAfter={(node) => setAdding({ after: node })}
          />
          <ReorderSheet board={board} visible={reordering} onClose={() => setReordering(false)} />
        </>
      ) : null}
      <AddNodeSheet
        boardPageId={page.id}
        after={adding?.after ?? null}
        visible={adding !== null}
        onClose={() => setAdding(null)}
        onAdded={() => {
          setChosenTab('path');
          void load();
        }}
      />
    </View>
  );
}
