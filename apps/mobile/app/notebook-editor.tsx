import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Check, ChevronLeft } from 'lucide-react-native';
import { getPage, savePageContent, updatePage } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterNotebookPage, notebookPageDetailsChanged, type ConflictChoice, type MergeResult, type SaveAnswer, type SyncStatus } from '@beyou/state';
import { withAlpha } from '@beyou/theme';
import type { NotebookPage } from '@beyou/types/notebook/notebook';
import Button from '../src/ui/Button';
import NotebookEditorDom from '../src/notebook/editor/NotebookEditorDom';
import EditorToolbar from '../src/notebook/editor/EditorToolbar';
import { BlockSheet, ConflictSheet, LinkSheet } from '../src/notebook/editor/EditorSheets';
import {
  NO_FORMAT,
  type EditorCommand,
  type EditorFormat,
  type EditorPalette,
  type EditorStrings,
  type NotebookEditorHandle,
} from '../src/notebook/editor/editorBridge';
import { useKeyboardLift } from '../src/ui/keyboard';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch } from '../src/store';

/** How long leaving waits for the last edit to reach the server before it goes anyway. */
const LEAVE_WAIT_MS = 4000;

/**
 * A page's notes, edited on the phone. Full screen and outside the `(app)` group, like the card
 * review: the bottom bar would sit between the text and the keyboard.
 *
 * The page is read fresh on the way in, so the editor starts from the server's latest revision.
 * Saving, merging with what was saved elsewhere, and the conflict question work as on the web:
 * the editor and its DocumentSync run inside the web view (NotebookEditorDom), and this screen
 * lends them the network. Leaving waits for an edit still in the air.
 */
export default function NotebookEditorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  // Through the context, as BottomSheet reads it: null without a provider (jest), so 0.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { lift, onLayout } = useKeyboardLift();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [page, setPage] = useState<NotebookPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [conflict, setConflict] = useState<MergeResult | null>(null);
  const [format, setFormat] = useState<EditorFormat>(NO_FORMAT);
  const [blockSheet, setBlockSheet] = useState<'insert' | 'turnInto' | null>(null);
  const [linkSheet, setLinkSheet] = useState(false);
  const editor = useRef<NotebookEditorHandle>(null);
  const pending = useRef(false);
  const settled = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void getPage(id, t).then((response) => {
      if (!alive) return;
      if (response.success) {
        setPage(response.success);
        setTitle(response.success.title);
        dispatch(enterNotebookPage(response.success));
      } else {
        setFailed(true);
        notify.error(getFriendlyErrorMessage(t, response.error));
      }
    });
    return () => {
      alive = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const command = useCallback((next: EditorCommand) => editor.current?.command?.(next), []);

  // Leaving with an edit not yet on the server: send it now and wait for the answer, so the page
  // screen behind reads what was just written.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!pending.current) return;
        event.preventDefault();
        const leave = () => {
          settled.current = null;
          pending.current = false;
          navigation.dispatch(event.data.action);
        };
        settled.current = leave;
        editor.current?.flush?.();
        setTimeout(() => settled.current === leave && leave(), LEAVE_WAIT_MS);
      }),
    [navigation],
  );

  // Off to the background: the last edit goes now, not when the debounce would send it, in case
  // Android ends the app there. Back again: whatever was saved elsewhere meanwhile is merged in.
  useEffect(() => {
    if (!id) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') editor.current?.flush?.();
      if (state === 'active') {
        void getPage(id, t).then((response) => {
          if (response.success) editor.current?.serverChanged?.(response.success);
        });
      }
    });
    return () => subscription.remove();
  }, [id, t]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/notebook/${id}`));

  const saveTitle = async () => {
    if (!page) return;
    const next = title.trim();
    if (!next || next === page.title) {
      setTitle(page.title);
      return;
    }
    const response = await updatePage(page.id, { title: next }, t);
    if (!response.success) {
      setTitle(page.title);
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setPage(response.success);
    dispatch(enterNotebookPage(response.success));
    dispatch(notebookPageDetailsChanged({ pageId: response.success.id, title: response.success.title, icon: response.success.icon }));
  };

  const palette = useMemo<EditorPalette>(
    () => ({
      bg: theme.bg,
      surface: theme.surface,
      surface2: theme.surface2,
      border: theme.border,
      text: theme.text,
      text2: theme.text2,
      text3: theme.text3,
      accent: theme.accent,
      accentSoft: theme.accentSoft,
      onAccent: theme.onAccent,
      xp: theme.xp,
      xpSoft: theme.xpSoft,
      textFaint: withAlpha(theme.text, 0.35),
    }),
    [theme],
  );

  const strings = useMemo<EditorStrings>(
    () => ({
      placeholder: t('NotebookMobileEditorPlaceholder'),
      board: t('NotebookBoardTitle'),
      boardHint: t('NotebookMobileEditorBoardHint'),
      cards: t('NotebookMobileCardsCount', { count: page?.cardsTotal ?? 0 }),
      cardsHint: page && page.cardsDue > 0
        ? t('NotebookMobileCardsDue', { count: page.cardsDue })
        : t('NotebookMobileEditorCardsHint'),
    }),
    [t, page],
  );

  if (!page) {
    return (
      <View className="flex-1 items-center justify-center bg-bg" testID="notebook-editor-loading">
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

  const crumbs = page.breadcrumb.slice(0, -1).map((crumb) => crumb.title).join(' › ');

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: lift > 0 ? lift : insets.bottom }} onLayout={onLayout} testID="notebook-editor-screen">
      <View className="flex-row items-center gap-1 px-2 pb-1 pt-1">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookMobileBack')}
          className="h-11 w-11 items-center justify-center"
          testID="editor-back"
        >
          <ChevronLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="flex-1 text-[12px] text-text-2" numberOfLines={1}>
          {crumbs || t('Notebook')}
        </Text>
        {/* Nothing is saved while a conflict waits on the person, so no "Saving" either. */}
        <SaveState status={conflict ? null : status} />
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        onEndEditing={() => void saveTitle()}
        returnKeyType="done"
        blurOnSubmit
        accessibilityLabel={t('NotebookMobileEditorTitle')}
        placeholder={t('NotebookMobileEditorTitle')}
        placeholderTextColor={theme.text3}
        className="px-5 pb-2 font-bold text-[24px] leading-[30px] text-text"
        maxLength={255}
        testID="editor-title"
      />

      <View className="flex-1">
        <NotebookEditorDom
          ref={editor}
          content={page.content}
          revision={page.contentRevision}
          cardsTotal={page.cardsTotal}
          language={i18n.language ?? 'en'}
          strings={strings}
          palette={palette}
          save={async (content, baseRevision): Promise<SaveAnswer> => {
            const response = await savePageContent(page.id, content, baseRevision, t);
            if (response.success) return { saved: true, revision: response.success.contentRevision };
            return { saved: false, conflict: response.error?.errorKey === 'NOTEBOOK_CONTENT_CONFLICT' };
          }}
          fetchPage={async () => {
            const response = await getPage(page.id, t);
            return response.success ?? null;
          }}
          onStatus={async (next) => setStatus(next)}
          onConflict={async (result) => setConflict(result)}
          onPending={async (next) => {
            pending.current = next;
            if (!next) settled.current?.();
          }}
          onFormat={async (next) => setFormat(next)}
          openBoard={async () => router.dismissTo({ pathname: '/notebook/[id]', params: { id: page.id, tab: 'path' } })}
          openCards={async () => router.dismissTo({ pathname: '/notebook/[id]', params: { id: page.id, tab: 'cards' } })}
          openLink={async (url) => {
            if (/^(https?:|mailto:)/i.test(url)) void Linking.openURL(url);
          }}
          dom={{ style: { flex: 1, backgroundColor: theme.bg }, containerStyle: { flex: 1 } }}
        />
      </View>

      <EditorToolbar
        format={format}
        onCommand={command}
        onInsert={() => setBlockSheet('insert')}
        onTurnInto={() => setBlockSheet('turnInto')}
        onLink={() => setLinkSheet(true)}
      />

      <BlockSheet
        mode={blockSheet}
        current={format.block}
        onClose={() => setBlockSheet(null)}
        onPick={(block) => {
          command(blockSheet === 'turnInto' ? { kind: 'turnInto', block } : { kind: 'insert', block });
          setBlockSheet(null);
        }}
      />
      <LinkSheet
        visible={linkSheet}
        current={format.link}
        onClose={() => setLinkSheet(false)}
        onSave={(url) => {
          command({ kind: 'link', url });
          setLinkSheet(false);
        }}
      />
      <ConflictSheet
        conflict={conflict}
        onResolve={(choices: Record<string, ConflictChoice>) => {
          setConflict(null);
          editor.current?.resolve?.(choices);
        }}
      />
    </View>
  );
}

function SaveState({ status }: { status: SyncStatus | null }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  if (!status) return null;
  if (status === 'saved') {
    return (
      <View className="flex-row items-center gap-1 pr-3" testID="editor-save-state">
        <Check size={12} color={theme.success} />
        <Text className="font-mono text-[11px] text-success">{t('NotebookSaved')}</Text>
      </View>
    );
  }
  return (
    <Text className={`pr-3 font-mono text-[11px] ${status === 'failed' ? 'text-danger' : 'text-text-2'}`} testID="editor-save-state">
      {status === 'failed' ? t('NotebookMobileEditorNotSaved') : t('NotebookSaving')}
    </Text>
  );
}
