import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Archive, History, Pencil, Plus, Repeat, X } from 'lucide-react-native';
import {
  archiveStudyCycle, getStudyCycle, getStudyCycles, replaceStudyBlocks, updateStudyBlock,
} from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterStudyCycle, enterStudyCycles, nextBlockOfTopic, removeStudyCycle } from '@beyou/state';
import type { BlockPatch, StudyBlock, StudyCycle } from '@beyou/types/notebook/studyCycle';
import Button from '../src/ui/Button';
import EmptyState from '../src/ui/EmptyState';
import HeaderIconButton from '../src/notebook/cycles/HeaderIconButton';
import BlockRow, { type TodayBadge } from '../src/notebook/cycles/BlockRow';
import BlockSheet from '../src/notebook/cycles/BlockSheet';
import LogSessionSheet from '../src/notebook/cycles/LogSessionSheet';
import { LapCard, PreviousLaps, WeekCard } from '../src/notebook/cycles/CycleSections';
import { blockRequestOf, moveBlock } from '../src/notebook/cycles/cycleText';
import { useStudyToday } from '../src/notebook/cycles/useStudyToday';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch, RootState } from '../src/store';

/**
 * The study cycles on a phone: one tab per active cycle, the lap so far, the ordered blocks of
 * the lap, the week and the laps before. Full screen and outside the `(app)` group like the
 * notebook's other full screens.
 *
 * A block opens its own settings in a sheet (a PATCH); "Reorder" swaps the list for move arrows
 * (each move is one PUT of the whole order). "Log a session" credits study done away from the
 * timer. Archiving asks first and frees the cycle's topics for another one.
 */
export default function NotebookCyclesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { id: askedId } = useLocalSearchParams<{ id?: string }>();
  const list = useSelector((s: RootState) => s.studyCycles.list);
  const byId = useSelector((s: RootState) => s.studyCycles.byId);
  const { today, load: loadToday } = useStudyToday();
  const [listLoaded, setListLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(askedId ?? null);
  const [editing, setEditing] = useState<StudyBlock | null>(null);
  const [reordering, setReordering] = useState(false);
  const [moving, setMoving] = useState(false);
  const [logging, setLogging] = useState(false);

  const activeId = selectedId && list.some((cycle) => cycle.id === selectedId) ? selectedId : list[0]?.id ?? null;
  const cycle = activeId ? byId[activeId] : undefined;

  const loadCycle = useCallback(
    async (cycleId: string) => {
      const response = await getStudyCycle(cycleId, t);
      if (response.success) dispatch(enterStudyCycle(response.success));
      else notify.error(getFriendlyErrorMessage(t, response.error));
    },
    [dispatch, t],
  );

  const loadList = useCallback(async () => {
    const response = await getStudyCycles(t);
    setListLoaded(true);
    if (response.success) dispatch(enterStudyCycles(response.success));
    else notify.error(getFriendlyErrorMessage(t, response.error));
    return response.success ?? null;
  }, [dispatch, t]);

  // Every time the screen comes back: the editor, the history or a pomodoro elsewhere moved it.
  useFocusEffect(
    useCallback(() => {
      void loadList();
      void loadToday();
    }, [loadList, loadToday]),
  );

  useEffect(() => {
    if (activeId) void loadCycle(activeId);
  }, [activeId, loadCycle]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/notebook'));

  /** Today's blocks of this cycle: the first to study now, the rest later today. */
  const badges = useMemo(() => {
    const map = new Map<string, TodayBadge>();
    const ofCycle = today?.cycles.find((entry) => entry.cycleId === activeId);
    const ahead = (ofCycle?.entries ?? []).filter((entry) => !entry.doneToday && !entry.nextLap);
    ahead.forEach((entry, index) => map.set(entry.blockId, index === 0 ? 'next' : 'today'));
    return map;
  }, [activeId, today]);

  const saveBlock = async (block: StudyBlock, patch: BlockPatch): Promise<boolean> => {
    if (!cycle) return false;
    const response = await updateStudyBlock(cycle.id, block.id, patch, t);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return false;
    }
    dispatch(enterStudyCycle(response.success));
    void loadToday();
    notify.success(t('StudyCycleMobileBlockSaved'));
    return true;
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!cycle || moving) return;
    const moved = moveBlock(cycle.blocks, index, direction);
    if (!moved) return;
    setMoving(true);
    const response = await replaceStudyBlocks(cycle.id, moved.map(blockRequestOf), t);
    setMoving(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    dispatch(enterStudyCycle(response.success));
    void loadToday();
  };

  const archive = (target: StudyCycle) => {
    Alert.alert(t('StudyCycleMobileArchiveTitle', { name: target.name }), t('StudyCycleMobileArchiveBody'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('StudyCycleMobileArchive'),
        style: 'destructive',
        onPress: () => void confirmArchive(target),
      },
    ]);
  };

  const confirmArchive = async (target: StudyCycle) => {
    const response = await archiveStudyCycle(target.id, t);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    dispatch(removeStudyCycle(target.id));
    setSelectedId(null);
    setReordering(false);
    notify.success(t('StudyCycleMobileArchived', { name: target.name }));
    void loadList();
    void loadToday();
  };

  const firstOpenTopic = cycle?.blocks.find((block) => block.progress.state === 'OPEN')?.topic.id ?? cycle?.topics[0]?.topicId ?? null;

  const header = (
    <View className="flex-row items-center gap-1 px-2 pb-2 pt-1">
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Close')} className="h-11 w-11 items-center justify-center" testID="cycles-close">
        <X size={20} color={theme.text} />
      </Pressable>
      <Text accessibilityRole="header" className="min-w-0 flex-1 text-[20px] font-semibold text-text" numberOfLines={1}>
        {t('StudyCycleMobileCycles')}
      </Text>
      {cycle ? (
        <HeaderIconButton
          label={t('StudyCycleMobileHistory')}
          onPress={() => router.push({ pathname: '/notebook-cycle-history', params: { id: cycle.id } })}
          testID="cycles-history"
        >
          <History size={20} color={theme.text} />
        </HeaderIconButton>
      ) : null}
      <HeaderIconButton
        label={t('StudyCycleMobileNewCycle')}
        onPress={() => router.push('/notebook-cycle-edit')}
        testID="cycles-new"
      >
        <Plus size={20} color={theme.text} />
      </HeaderIconButton>
    </View>
  );

  const body = !listLoaded && list.length === 0 ? (
    <View className="flex-1 items-center justify-center" testID="cycles-loading">
      <ActivityIndicator color={theme.accent} />
    </View>
  ) : list.length === 0 ? (
    <View className="px-4 pt-4">
      <EmptyState
        icon={<Repeat size={22} color={theme.accent} />}
        title={t('StudyCycleMobileEmptyTitle')}
        description={t('StudyCycleMobileEmptyBody')}
        actionLabel={t('StudyCycleMobileBuild')}
        onAction={() => router.push('/notebook-cycle-edit')}
        testID="cycles-empty"
      />
    </View>
  ) : (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
      {list.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} testID="cycles-tabs">
          {list.map((summary) => {
            const active = summary.id === activeId;
            return (
              <Pressable
                key={summary.id}
                onPress={() => {
                  setSelectedId(summary.id);
                  setReordering(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={`h-10 flex-row items-center gap-2 rounded-full border px-3.5 ${
                  active ? 'border-text bg-text' : 'border-border bg-surface'
                }`}
                testID={`cycles-tab-${summary.id}`}
              >
                <Text className={`text-[13.5px] font-semibold ${active ? 'text-bg' : 'text-text'}`}>{summary.name}</Text>
                <Text className={`font-mono text-[11.5px] ${active ? 'text-bg' : 'text-text-3'}`}>
                  {`${summary.lap.blocksClosed}/${summary.lap.blocks}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {!cycle ? (
        <View className="items-center py-10">
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <>
          {/* With one cycle there are no tabs to name it. */}
          {list.length === 1 ? (
            <Text className="text-[22px] font-semibold text-text" testID="cycles-name">
              {cycle.name}
            </Text>
          ) : null}
          <LapCard lap={cycle.lap}>
            <View className="flex-row gap-2">
              <Button
                text={t('StudyCycleMobileLogSession')}
                mode="primary"
                size="auto"
                className="flex-1"
                icon={<Plus size={16} color={theme.onAccent} />}
                onPress={() => setLogging(true)}
                testID="cycles-log"
              />
              <Button
                text={t('StudyCycleMobileEditCycle')}
                mode="tonal"
                size="auto"
                icon={<Pencil size={15} color={theme.accent} />}
                onPress={() => router.push({ pathname: '/notebook-cycle-edit', params: { id: cycle.id } })}
                testID="cycles-edit"
              />
            </View>
          </LapCard>

          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-text">{t('StudyCycleMobileBlocks')}</Text>
            <Button
              text={reordering ? t('StudyCycleMobileReorderDone') : t('StudyCycleMobileReorder')}
              mode="ghost"
              size="auto"
              onPress={() => setReordering((value) => !value)}
              testID="cycles-reorder"
            />
          </View>
          <View className="gap-2" testID="cycles-blocks">
            {cycle.blocks.map((block, index) => (
              <BlockRow
                key={block.id}
                block={block}
                badge={badges.get(block.id) ?? null}
                nextPosition={nextBlockOfTopic(cycle.blocks, block)?.position ?? null}
                reordering={reordering}
                canMoveUp={index > 0}
                canMoveDown={index < cycle.blocks.length - 1}
                busy={moving}
                onPress={() => setEditing(block)}
                onMove={(direction) => void move(index, direction)}
              />
            ))}
          </View>

          <WeekCard days={cycle.days} today={today?.weekday ?? null} />
          <PreviousLaps laps={cycle.previousLaps} />

          <Button
            text={t('StudyCycleMobileArchive')}
            mode="danger"
            size="block"
            icon={<Archive size={16} color={theme.danger} />}
            onPress={() => archive(cycle)}
            testID="cycles-archive"
          />
        </>
      )}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} testID="cycles-screen">
      {header}
      {body}
      <BlockSheet block={editing} onClose={() => setEditing(null)} onSave={(patch) => (editing ? saveBlock(editing, patch) : Promise.resolve(false))} />
      <LogSessionSheet
        visible={logging}
        onClose={() => setLogging(false)}
        topicId={firstOpenTopic}
      />
    </View>
  );
}
