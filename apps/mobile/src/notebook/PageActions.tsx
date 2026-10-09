import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { FilePlus, Pencil, RotateCcw, Shapes, Trash2 } from 'lucide-react-native';
import { createPage, deletePage, updatePage } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterNotebookPage, notebookPageDetailsChanged, removeNotebookPage } from '@beyou/state';
import type { NotebookPage } from '@beyou/types/notebook/notebook';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import DeleteModal from '../ui/DeleteModal';
import Input from '../ui/Input';
import IconPicker from '../ui/icons/IconPicker';
import { notify } from '../notify';
import { useBeyouTheme } from '../theme/ThemeProvider';
import type { AppDispatch } from '../store';

type Step = 'menu' | 'rename' | 'icon' | 'delete' | null;

/**
 * What the "⋯" on a page offers on the phone: rename, icon, a new page under this one, delete.
 * The web's header and tree do the same, through the same endpoints.
 *
 * A topic's delete takes every page under it, so the dialog says so, as the web's does.
 */
export default function PageActions({
  page,
  open,
  onClose,
}: {
  page: NotebookPage;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [step, setStep] = useState<Step>(null);
  const [title, setTitle] = useState(page.title);
  const [busy, setBusy] = useState(false);
  const isTopic = page.parentId === null;

  useEffect(() => {
    if (open) setStep('menu');
  }, [open]);
  useEffect(() => setTitle(page.title), [page.title]);

  const close = () => {
    setStep(null);
    onClose();
  };

  const saved = (next: NotebookPage) => {
    dispatch(enterNotebookPage(next));
    dispatch(notebookPageDetailsChanged({ pageId: next.id, title: next.title, icon: next.icon }));
  };

  const rename = async () => {
    const next = title.trim();
    if (!next || next === page.title) return close();
    setBusy(true);
    const response = await updatePage(page.id, { title: next }, t);
    setBusy(false);
    if (!response.success) return notify.error(getFriendlyErrorMessage(t, response.error));
    saved(response.success);
    close();
  };

  /** A blank icon clears it on the server, and the default comes back. */
  const changeIcon = async (icon: string) => {
    close();
    const response = await updatePage(page.id, { icon }, t);
    if (!response.success) return notify.error(getFriendlyErrorMessage(t, response.error));
    saved(response.success);
  };

  const addPage = async () => {
    setBusy(true);
    const response = await createPage({ parentId: page.id, title: t('NotebookUntitled') }, t);
    setBusy(false);
    if (!response.success) return notify.error(getFriendlyErrorMessage(t, response.error));
    dispatch(enterNotebookPage(response.success));
    close();
    // Straight into its notes, title first, as the web opens a new page.
    router.push({ pathname: '/notebook-editor', params: { id: response.success.id } });
  };

  const remove = async () => {
    setBusy(true);
    const response = await deletePage(page.id, t);
    setBusy(false);
    if (response.error) return notify.error(getFriendlyErrorMessage(t, response.error));
    close();
    dispatch(removeNotebookPage(page.id));
    // To the parent, as the web lands: back to it when it is under this screen, in its place when
    // the page was opened some other way (a link, the review).
    router.dismissTo(page.parentId ? `/notebook/${page.parentId}` : '/notebook');
  };

  return (
    <>
      <BottomSheet visible={step === 'menu'} onClose={close}>
        <View testID="page-actions">
          <Action Icon={Pencil} label={t('NotebookMobileRename')} onPress={() => setStep('rename')} testID="page-action-rename" />
          <Action Icon={Shapes} label={t('NotebookIconTitle')} onPress={() => setStep('icon')} testID="page-action-icon" />
          {page.icon ? (
            <Action Icon={RotateCcw} label={t('NotebookIconDefault')} onPress={() => void changeIcon('')} testID="page-action-icon-default" />
          ) : null}
          <Action Icon={FilePlus} label={t('NotebookAddPage')} onPress={() => void addPage()} disabled={busy} testID="page-action-add" />
          <Action
            Icon={Trash2}
            label={t(isTopic ? 'NotebookDeleteTopic' : 'NotebookDeletePage')}
            onPress={() => setStep('delete')}
            danger
            testID="page-action-delete"
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={step === 'rename'} onClose={close}>
        <View className="gap-3">
          <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
            {t('NotebookMobileRename')}
          </Text>
          <Input
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={255}
            accessibilityLabel={t('NotebookPageTitle')}
            returnKeyType="done"
            onSubmitEditing={() => void rename()}
            testID="page-rename-input"
          />
          <Button text={t('NotebookSave')} mode="primary" size="block" submitting={busy} disabled={!title.trim()} onPress={() => void rename()} testID="page-rename-save" />
        </View>
      </BottomSheet>

      <IconPicker
        visible={step === 'icon'}
        selectedIcon={page.icon}
        onSelect={(icon) => void changeIcon(icon)}
        onClose={close}
      />

      <DeleteModal
        visible={step === 'delete'}
        deletePhrase={t('NotebookDeleteTitle', { title: page.title })}
        name={page.title}
        detail={t('NotebookDeleteExplain')}
        pending={busy}
        onCancel={close}
        onConfirm={() => void remove()}
        testID="page-delete"
      />
    </>
  );
}

function Action({
  Icon,
  label,
  onPress,
  danger = false,
  disabled = false,
  testID,
}: {
  Icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { theme } = useBeyouTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className="min-h-12 flex-row items-center gap-3 rounded-xl px-2 active:bg-surface-2"
      testID={testID}
    >
      <Icon size={20} color={danger ? theme.danger : theme.text} />
      <Text className={`text-[15px] ${danger ? 'text-danger' : 'text-text'}`}>{label}</Text>
    </Pressable>
  );
}
