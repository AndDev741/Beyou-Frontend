import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Target, X } from 'lucide-react-native';
import { getPage, getStudyRoom } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterNotebookPage } from '@beyou/state';
import type { NotebookSource, StudyRoom } from '@beyou/types/notebook/notebook';
import BottomSheet from '../src/ui/BottomSheet';
import Button from '../src/ui/Button';
import SegmentedControl from '../src/ui/SegmentedControl';
import StudySetupForm, { SCOPE_KEYS } from '../src/notebook/study/StudySetupForm';
import StudyChat from '../src/notebook/study/StudyChat';
import StudySources from '../src/notebook/study/StudySources';
import StudyStudio from '../src/notebook/study/StudyStudio';
import { useKeyboardLift } from '../src/ui/keyboard';
import { notify } from '../src/notify';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import type { AppDispatch } from '../src/store';

type Tab = 'chat' | 'sources' | 'studio';

/**
 * A page's study room on the phone: the web's room as three tabs, Chat, Sources and Studio, under
 * the room's goal and the notes it reads. Full screen and outside the `(app)` group like the
 * editor, so the bottom bar never sits between the question and the keyboard.
 *
 * A room nobody has set up opens on its setup, as on the web; "Edit" on the goal bar reopens it.
 */
export default function NotebookStudyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const { lift, onLayout } = useKeyboardLift();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [editingSetup, setEditingSetup] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const response = await getStudyRoom(id, t);
    if (response.success) setRoom(response.success);
    else {
      setFailed(true);
      notify.error(getFriendlyErrorMessage(t, response.error));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Cards made here change the page's counts: the screens behind read the page again. */
  const cardsMade = async () => {
    if (!id) return;
    const page = await getPage(id, t);
    if (page.success) dispatch(enterNotebookPage(page.success));
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace(`/notebook/${id}`));

  if (!room) {
    return (
      <View className="flex-1 items-center justify-center bg-bg" testID="study-loading">
        {failed ? (
          <View className="items-center gap-3 px-8">
            <Text className="text-center text-[15px] text-text-2">{t('NotebookMobilePageMissing')}</Text>
            <Button text={t('NotebookMobileBack')} mode="tonal" size="auto" onPress={close} />
          </View>
        ) : (
          <ActivityIndicator color={theme.accent} />
        )}
      </View>
    );
  }

  const header = (
    <View className="flex-row items-center gap-1 px-2 pb-1.5 pt-1">
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Close')} className="h-11 w-11 items-center justify-center" testID="study-close">
        <X size={20} color={theme.text} />
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text accessibilityRole="header" className="text-[15px] font-bold text-text">{t('NotebookStudyRoom')}</Text>
        <Text className="text-[12px] text-text-2" numberOfLines={1}>{room.page.title}</Text>
      </View>
    </View>
  );

  // Never set up: the setup is the room until it is saved.
  if (!room.setup.configuredAt) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: lift > 0 ? lift : insets.bottom }} onLayout={onLayout}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <StudySetupForm
            pageId={room.page.id}
            setup={room.setup}
            scopes={room.scopes}
            firstTime
            onSaved={(setup) => setRoom({ ...room, setup })}
          />
        </ScrollView>
      </View>
    );
  }

  const enabled = room.sources.filter((source) => source.enabled).length;

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: insets.top, paddingBottom: lift > 0 ? lift : insets.bottom }}
      onLayout={onLayout}
      testID="study-room"
    >
      {header}
      <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-xl border border-border bg-surface py-1.5 pl-3 pr-1.5" testID="study-goal-bar">
        <Target size={14} color={theme.accent} />
        <Text className="min-w-0 flex-1 text-[12px] text-text-2" numberOfLines={1}>
          {room.setup.goal ? <Text className="font-semibold text-text">{`${room.setup.goal} · `}</Text> : null}
          {t(SCOPE_KEYS[room.setup.scope].title)}
        </Text>
        <Button text={t('Edit')} mode="ghost" size="auto" onPress={() => setEditingSetup(true)} testID="study-edit-setup" />
      </View>
      <View className="px-4 pb-1">
        <SegmentedControl<Tab>
          label={t('NotebookStudyRoom')}
          options={[
            { value: 'chat', label: t('NotebookMobileStudyChat') },
            { value: 'sources', label: room.sources.length > 0 ? `${t('NotebookStudySources')} · ${enabled}` : t('NotebookStudySources') },
            { value: 'studio', label: t('NotebookStudyStudio') },
          ]}
          value={tab}
          onChange={setTab}
          testID="study-tab"
        />
      </View>

      {tab === 'chat' ? (
        <StudyChat pageId={room.page.id} initialMessages={room.messages} onCardsMade={() => void cardsMade()} />
      ) : tab === 'sources' ? (
        <StudySources
          pageId={room.page.id}
          initialSources={room.sources}
          discovery={room.discovery}
          onChanged={(sources: NotebookSource[]) => setRoom((current) => (current ? { ...current, sources } : current))}
        />
      ) : (
        <StudyStudio pageId={room.page.id} initialOutputs={room.outputs} onCardsMade={() => void cardsMade()} />
      )}

      <BottomSheet visible={editingSetup} onClose={() => setEditingSetup(false)}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <StudySetupForm
            pageId={room.page.id}
            setup={room.setup}
            scopes={room.scopes}
            firstTime={false}
            onCancel={() => setEditingSetup(false)}
            onSaved={(setup) => {
              setRoom({ ...room, setup });
              setEditingSetup(false);
            }}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
