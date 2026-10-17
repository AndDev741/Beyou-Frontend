import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Archive, ChevronLeft, LayoutGrid, Plus, Scan, StickyNote } from 'lucide-react-native';
import getCategories from '@beyou/api/categories/getCategories';
import { quickNoteTaskPrefill } from '@beyou/state';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import {
  QUICK_NOTE_MAX_ACTIVE,
  QUICK_NOTE_TEXT_MAX,
  type QuickNote,
} from '@beyou/types/quickNote/quickNote';
import Button from '../../src/ui/Button';
import EmptyState from '../../src/ui/EmptyState';
import Input from '../../src/ui/Input';
import TaskForm, { type TaskFormValues } from '../../src/ui/tasks/TaskForm';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import ArchivedNotesSheet from '../../src/ideas/ArchivedNotesSheet';
import PillButton from '../../src/ideas/PillButton';
import QuickNoteBoard, { type QuickNoteBoardHandle } from '../../src/ideas/QuickNoteBoard';
import QuickNoteSheet from '../../src/ideas/QuickNoteSheet';
import { useQuickNotes } from '../../src/ideas/useQuickNotes';
import type { AppDispatch, RootState } from '../../src/store';

type Converting = { note: QuickNote; text: string };

/**
 * Ideas: a corkboard for whatever crosses your mind, to sort out later.
 *
 * Capture sits on top and keeps the keyboard up, so three ideas in a row are three Enters. The
 * board below is free: notes stay where they were dropped (see QuickNoteBoard for the fingers).
 * Opening a note gives the sheet to edit it, turn it into a task or archive it.
 */
export default function IdeasScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const notes = useQuickNotes();
  const { active, loaded, loadError, reload } = notes;
  const categories = useSelector((state: RootState) => state.categories.categories);
  const board = useRef<QuickNoteBoardHandle>(null);

  const [draft, setDraft] = useState('');
  const [capturing, setCapturing] = useState(false);
  const capturingRef = useRef(false);
  const [tidying, setTidying] = useState(false);
  // A snapshot, not an id into the list: a refresh landing while the sheet is open must not
  // re-seed the text someone is typing.
  const [editing, setEditing] = useState<QuickNote | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [converting, setConverting] = useState<Converting | null>(null);

  useEffect(() => {
    void reload();
  }, [reload]);
  // Back on this screen from another one, or from the background: the web and the assistant
  // write to the same board.
  useAutoRefresh(reload);

  /**
   * `submitted` is the text the keyboard's Enter carried. Read from the event rather than from
   * `draft`: a fast typist (or a slow phone) can press Enter before the last onChangeText render,
   * and the note would lose its final letters.
   */
  const capture = async (submitted?: string) => {
    const text = (submitted ?? draft).trim();
    if (!text || capturingRef.current) return;
    capturingRef.current = true;
    setCapturing(true);
    const note = await notes.create(text);
    capturingRef.current = false;
    setCapturing(false);
    if (!note) return;
    setDraft('');
    // The server picked the spot; show it there.
    board.current?.centerOn(note);
  };

  const tidy = async () => {
    setTidying(true);
    const tidied = await notes.tidy();
    setTidying(false);
    if (tidied) board.current?.fit(tidied);
  };

  const open = useCallback((note: QuickNote) => {
    Keyboard.dismiss();
    setEditing(note);
  }, []);

  const makeTask = (note: QuickNote, text: string) => {
    setEditing(null);
    setConverting({ note, text });
    // The form's category picker reads the store; this screen may be the first to need it.
    void getCategories(t).then((response) => {
      if (response.success) dispatch(enterCategories(response.success));
    });
  };

  const { drop } = notes;
  const onDrop = useCallback((id: string, at: { x: number; y: number }) => void drop(id, at), [drop]);

  const prefill = useMemo(() => (converting ? quickNoteTaskPrefill(converting.text) : undefined), [converting]);

  const submitConversion = async (values: TaskFormValues) => {
    if (!converting) return {};
    const response = await notes.convert(converting.note.id, values);
    return { error: response.error };
  };

  const empty = loaded && active.length === 0;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }} testID="ideas-screen">
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('IdeasMobileBack')}
          testID="back-button"
          className="h-11 w-8 justify-center"
        >
          <ChevronLeft size={24} color={theme.text2} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
            {t('Ideas')}
          </Text>
          <Text className="text-[12.5px] text-text-3" numberOfLines={1} testID="ideas-count">
            {t('IdeasCount', { count: active.length, max: QUICK_NOTE_MAX_ACTIVE })}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 px-4 pb-2">
        <View className="min-w-0 flex-1">
          <Input
            compact
            value={draft}
            onChangeText={setDraft}
            maxLength={QUICK_NOTE_TEXT_MAX}
            placeholder={t('IdeasCapturePlaceholder')}
            accessibilityLabel={t('IdeasCaptureLabel')}
            returnKeyType="done"
            // Keeps the keyboard up after Enter: capture is meant to be one idea after another.
            submitBehavior="submit"
            onSubmitEditing={(event) => void capture(event?.nativeEvent?.text)}
            testID="ideas-capture"
          />
        </View>
        <Pressable
          onPress={() => void capture()}
          disabled={!draft.trim() || capturing}
          accessibilityRole="button"
          accessibilityLabel={t('IdeasAdd')}
          accessibilityState={{ disabled: !draft.trim() || capturing, busy: capturing }}
          testID="ideas-capture-submit"
          className={`h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent ${
            draft.trim() && !capturing ? 'active:opacity-80' : 'opacity-50'
          }`}
        >
          {capturing ? <ActivityIndicator color={theme.onAccent} /> : <Plus size={22} color={theme.onAccent} />}
        </Pressable>
      </View>

      <View className="flex-row flex-wrap items-center gap-2 px-4 pb-3">
        <PillButton
          label={t('IdeasTidy')}
          icon={<LayoutGrid size={15} color={theme.text2} />}
          busy={tidying}
          disabled={active.length === 0}
          onPress={() => void tidy()}
          testID="ideas-tidy"
        />
        <PillButton
          label={t('IdeasFit')}
          icon={<Scan size={15} color={theme.text2} />}
          disabled={active.length === 0}
          onPress={() => board.current?.fit()}
          testID="ideas-fit"
        />
        <PillButton
          label={t('IdeasArchived')}
          icon={<Archive size={15} color={theme.text2} />}
          onPress={() => {
            // Or the first tap inside the sheet only closes the capture keyboard.
            Keyboard.dismiss();
            setArchivedOpen(true);
          }}
          testID="ideas-archived"
        />
      </View>

      {loadError && !loaded ? (
        <View
          className="mx-4 mb-3 flex-row items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
          testID="ideas-error"
        >
          <Text className="min-w-0 flex-1 text-[12.5px] text-text-2">{t('IdeasLoadFailed')}</Text>
          <Button text={t('TryAgain')} mode="ghost" size="auto" onPress={() => void reload()} />
        </View>
      ) : null}

      <QuickNoteBoard
        ref={board}
        notes={active}
        ready={loaded}
        onOpen={open}
        onDrop={onDrop}
        onEmptyTap={Keyboard.dismiss}
      >
        {!loaded && !loadError ? (
          <View className="flex-1 items-center justify-center" testID="ideas-loading">
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : null}
        {empty ? (
          <View className="flex-1 items-center justify-center px-6" testID="ideas-empty">
            <EmptyState
              icon={<StickyNote size={20} color={theme.accent} />}
              title={t('IdeasEmptyTitle')}
              description={t('IdeasEmptyBody')}
            />
            <Text className="mt-3 text-center text-[12px] text-text-3">{t('IdeasEmptyHintMobile')}</Text>
          </View>
        ) : null}
      </QuickNoteBoard>

      {editing ? (
        <QuickNoteSheet
          note={editing}
          onClose={() => setEditing(null)}
          onSave={notes.edit}
          onArchive={notes.archive}
          onMakeTask={makeTask}
        />
      ) : null}

      <ArchivedNotesSheet
        visible={archivedOpen}
        notes={notes.archived}
        onClose={() => setArchivedOpen(false)}
        onOpen={notes.loadArchived}
        onRestore={notes.restore}
        onDelete={notes.remove}
      />

      {/* Mounted only while converting: it seeds from the note when it opens. */}
      {converting ? (
        <TaskForm
          visible
          mode="create"
          task={null}
          categories={categories}
          initialValues={prefill}
          title={t('IdeasMakeTaskTitle')}
          createdMessage={t('IdeasConvertedToast')}
          submitCreate={submitConversion}
          onClose={() => setConverting(null)}
          onSaved={() => {}}
        />
      ) : null}
    </View>
  );
}
