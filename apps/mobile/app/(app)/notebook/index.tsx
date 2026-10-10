import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Layers, NotebookPen, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { deleteRoadmapDraft, getNotebookHome, listRoadmapDrafts } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { DRAFTS_POLL_MS, enterNotebookHome, progressShare } from '@beyou/state';
import type { RoadmapDraftSummary, TopicSummary } from '@beyou/types/notebook/notebook';
import Button from '../../../src/ui/Button';
import Card from '../../../src/ui/Card';
import Chip from '../../../src/ui/Chip';
import DeleteModal from '../../../src/ui/DeleteModal';
import EmptyState from '../../../src/ui/EmptyState';
import IconTile from '../../../src/ui/IconTile';
import BeyouIcon from '../../../src/ui/BeyouIcon';
import ProgressBar from '../../../src/notebook/ProgressBar';
import NewTopicSheet from '../../../src/notebook/NewTopicSheet';
import { AiWaitingLine } from '../../../src/notebook/AiWaiting';
import { notify } from '../../../src/notify';
import { useBeyouTheme } from '../../../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../../../src/store';

/**
 * The study notebook's home on a phone: the page to pick up, the cards due, the roadmap drafts
 * waiting for a decision, and the topics.
 *
 * "New topic" starts a blank one or drafts a roadmap with AI. A draft the model is still writing
 * turns into "Ready to review" on its own while the home is on screen.
 */
export default function NotebookHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const home = useSelector((s: RootState) => s.notebook.home);
  const [loading, setLoading] = useState(!home);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<RoadmapDraftSummary[]>([]);
  const [deleting, setDeleting] = useState<RoadmapDraftSummary | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadDrafts = useCallback(async () => {
    const response = await listRoadmapDrafts(t);
    if (response.success) setDrafts(response.success);
  }, [t]);

  const load = useCallback(async () => {
    const response = await getNotebookHome(t);
    setLoading(false);
    if (response.success) {
      dispatch(enterNotebookHome(response.success));
      return;
    }
    notify.error(getFriendlyErrorMessage(t, response.error));
  }, [dispatch, t]);

  // Every time the screen comes back into view: a review or a status change elsewhere moves the
  // counts on this one.
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadDrafts();
    }, [load, loadDrafts]),
  );

  const anyDrafting = drafts.some((draft) => draft.status === 'DRAFTING');
  useFocusEffect(
    useCallback(() => {
      if (!anyDrafting) return;
      const timer = setInterval(() => void loadDrafts(), DRAFTS_POLL_MS);
      return () => clearInterval(timer);
    }, [anyDrafting, loadDrafts]),
  );

  const deleteDraft = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const response = await deleteRoadmapDraft(deleting.id, t);
    setDeletingBusy(false);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setDeleting(null);
    void loadDrafts();
  };

  const topics = home?.topics ?? [];
  const totals = topics.reduce(
    (sum, topic) => ({ done: sum.done + topic.progress.done, total: sum.total + topic.progress.total }),
    { done: 0, total: 0 },
  );

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }} testID="notebook-home">
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t("NotebookMobileBack")}
          className="h-11 w-11 items-center justify-center"
          testID="back-button"
        >
          <ChevronLeft size={24} color={theme.text2} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
            {t('Notebook')}
          </Text>
          {topics.length > 0 ? (
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {t('NotebookMobileHomeSubtitle', { count: topics.length, done: totals.done, total: totals.total })}
            </Text>
          ) : null}
        </View>
        <Button
          text={t('NotebookNewTopic')}
          mode="primary"
          size="auto"
          icon={<Plus size={16} color={theme.onAccent} />}
          onPress={() => setCreating(true)}
          testID="notebook-new-topic"
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
          {home?.continueStudying ? (
            <Card className="gap-3" testID="notebook-continue">
              <Text className="text-[11.5px] font-semibold uppercase tracking-[1px] text-text-3">
                {t('NotebookMobileContinue')}
              </Text>
              <View className="flex-row items-center gap-3">
                <IconTile size={40}>
                  {home.continueStudying.icon ? (
                    <BeyouIcon id={home.continueStudying.icon} size={20} color={theme.accent} />
                  ) : (
                    <NotebookPen size={20} color={theme.accent} />
                  )}
                </IconTile>
                <View className="min-w-0 flex-1">
                  <Text className="text-[16px] font-semibold text-text" numberOfLines={1}>
                    {home.continueStudying.title}
                  </Text>
                  <Text className="text-[13px] text-text-2" numberOfLines={1}>
                    {home.continueStudying.studyingTitle
                      ? t('NotebookMobileStudyingInside', {
                          topic: home.continueStudying.topicTitle ?? '',
                          page: home.continueStudying.studyingTitle,
                        })
                      : home.continueStudying.topicTitle ?? ''}
                  </Text>
                </View>
              </View>
              <ProgressBar share={progressShare(home.continueStudying.progress)} />
              <Button
                text={t('NotebookMobileOpen')}
                size="block"
                onPress={() => router.push(`/notebook/${home.continueStudying!.pageId}`)}
                testID="notebook-continue-open"
              />
            </Card>
          ) : null}

          {home && home.review.due > 0 ? (
            <Card className="gap-3" testID="notebook-review-card">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11.5px] font-semibold uppercase tracking-[1px] text-text-3">
                  {t('NotebookMobileReview')}
                </Text>
                {home.review.streak > 0 ? (
                  <Chip variant="flame">{t('NotebookMobileReviewStreak', { count: home.review.streak })}</Chip>
                ) : null}
              </View>
              <View className="flex-row items-center gap-3">
                <IconTile size={40}>
                  <Layers size={20} color={theme.xp} />
                </IconTile>
                <View className="min-w-0 flex-1">
                  <Text className="text-[16px] font-semibold text-text">
                    {t('NotebookMobileCardsDue', { count: home.review.due })}
                  </Text>
                  <Text className="text-[13px] text-text-2" numberOfLines={2}>
                    {home.review.byTopic.map((topic) => `${topic.title} ${topic.due}`).join(' · ')}
                  </Text>
                </View>
              </View>
              <Button
                text={t('NotebookMobileReviewNow')}
                size="block"
                mode="tonal"
                onPress={() => router.push('/notebook-review')}
                testID="notebook-review-now"
              />
            </Card>
          ) : null}

          {drafts.length > 0 ? (
            <View className="gap-2" testID="notebook-drafts">
              <Text className="mt-2 text-[15px] font-semibold text-text">{t('NotebookDrafts')}</Text>
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onOpen={() => router.push({ pathname: '/notebook-draft', params: { id: draft.id } })}
                  onDelete={() => setDeleting(draft)}
                />
              ))}
            </View>
          ) : null}

          <Text className="mt-2 text-[15px] font-semibold text-text">{t('NotebookMobileTopics')}</Text>
          {topics.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={22} color={theme.accent} />}
              title={t('NotebookMobileNoTopicsTitle')}
              description={t('NotebookMobileNoTopicsBody')}
              testID="notebook-empty"
            />
          ) : (
            topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} onPress={() => router.push(`/notebook/${topic.id}`)} />
            ))
          )}
        </ScrollView>
      )}
      <NewTopicSheet visible={creating} onClose={() => setCreating(false)} />
      <DeleteModal
        visible={deleting !== null}
        deletePhrase={t('NotebookDraftDeleteTitle', { title: deleting?.title ?? '' })}
        name={deleting?.title ?? ''}
        detail={t('NotebookDraftDeleteText')}
        pending={deletingBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void deleteDraft()}
        testID="draft-delete-modal"
      />
    </View>
  );
}

/** A roadmap draft waiting for a decision: open it to review and create, or delete it. */
function DraftCard({ draft, onOpen, onDelete }: { draft: RoadmapDraftSummary; onOpen: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface p-3" testID="draft-card">
      <Pressable onPress={onOpen} accessibilityRole="button" className="min-w-0 flex-1 flex-row items-center gap-3" testID="draft-open">
        <IconTile size={40}>
          <Sparkles size={20} color={theme.accent} />
        </IconTile>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>{draft.title}</Text>
          <View testID="draft-status">
            {draft.status === 'DRAFTING' ? (
              <AiWaitingLine label={t('NotebookDraftDrafting')} since={draft.startedAt} slowNote={false} />
            ) : draft.status === 'READY' ? (
              <Text className="text-[13px] font-semibold text-accent">{t('NotebookDraftReady', { count: draft.nodeCount })}</Text>
            ) : (
              <Text className="text-[13px] text-text-2">{t('NotebookDraftFailed')}</Text>
            )}
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={t('NotebookDraftDelete', { title: draft.title })}
        className="h-11 w-11 items-center justify-center"
        testID="draft-delete"
      >
        <Trash2 size={18} color={theme.text2} />
      </Pressable>
    </View>
  );
}

function TopicCard({ topic, onPress }: { topic: TopicSummary; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <Card onPress={onPress} interactive className="gap-3" testID="notebook-topic-card">
      <View className="flex-row items-start gap-3">
        <IconTile size={40}>
          {topic.icon ? (
            <BeyouIcon id={topic.icon} size={20} color={theme.accent} />
          ) : (
            <NotebookPen size={20} color={theme.accent} />
          )}
        </IconTile>
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-semibold text-text" numberOfLines={1}>
            {topic.title}
          </Text>
          {topic.description ? (
            <Text className="text-[13px] leading-[18px] text-text-2" numberOfLines={2}>
              {topic.description}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color={theme.text3} />
      </View>
      <View className="flex-row items-center gap-2.5">
        <View className="flex-1">
          <ProgressBar share={progressShare(topic.progress)} />
        </View>
        <Text className="font-mono-semibold text-[12px] text-text-2">
          {`${topic.progress.done}/${topic.progress.total}`}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {topic.cardsDue > 0 ? <Chip variant="flame">{t('NotebookMobileDueShort', { count: topic.cardsDue })}</Chip> : null}
        {topic.next ? <Chip>{t('NotebookMobileNext', { title: topic.next.title })}</Chip> : null}
        {topic.goal ? <Chip variant="accent">{topic.goal.name}</Chip> : null}
      </View>
    </Card>
  );
}
