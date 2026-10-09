import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { createTopic } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterNotebookPage } from '@beyou/state';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { notify } from '../notify';
import type { AppDispatch } from '../store';

/**
 * A blank topic from the phone: a title, then its page. Drafting a roadmap with AI stays on the
 * web for now.
 */
export default function NewTopicSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setTitle('');
  }, [visible]);

  const create = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    const response = await createTopic({ title: name }, t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    dispatch(enterNotebookPage(response.success));
    onClose();
    router.push(`/notebook/${response.success.id}`);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" testID="new-topic-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
          {t('NotebookNewTopic')}
        </Text>
        <Input
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={255}
          placeholder={t('NotebookTopicTitlePlaceholder')}
          accessibilityLabel={t('NotebookTopicTitleLabel')}
          returnKeyType="done"
          onSubmitEditing={() => void create()}
          testID="new-topic-title"
        />
        <Button
          text={t('NotebookCreateTopic')}
          mode="primary"
          size="block"
          submitting={busy}
          disabled={!title.trim()}
          onPress={() => void create()}
          testID="new-topic-submit"
        />
      </View>
    </BottomSheet>
  );
}
