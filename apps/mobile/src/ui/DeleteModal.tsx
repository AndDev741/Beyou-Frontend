import { Modal, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from './Button';

interface DeleteModalProps {
  visible: boolean;
  /** Pergunta do título: "Excluir este hábito?" */
  deletePhrase: string;
  /** Nome do item, citado no corpo. */
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Enquanto a chamada está no ar. */
  pending?: boolean;
  testID?: string;
}

/**
 * O desenho do mockup, igual ao da web: pergunta como título à esquerda, o item
 * entre aspas no corpo e as ações à direita — Cancelar (ghost) antes de Excluir
 * (destrutivo), que é a última e mais forte.
 *
 * Substitui o `Alert.alert` nativo, que não carrega tema, nem tipografia, nem o
 * nome do item — e vinha com a ordem de botões do sistema, não a nossa.
 */
export default function DeleteModal({
  visible,
  deletePhrase,
  name,
  onCancel,
  onConfirm,
  pending = false,
  testID = 'delete-modal',
}: DeleteModalProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Cancel')}
          onPress={onCancel}
          testID={`${testID}-backdrop`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          className="w-full max-w-[420px] rounded-card border border-border bg-surface p-5"
          testID={testID}
        >
          <Text
            accessibilityRole="header"
            className="text-[15px] font-semibold tracking-[-0.01em] text-text"
          >
            {deletePhrase}
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-snug text-text-2">
            {t('DeleteWillRemove', { name })}
          </Text>

          <View className="mt-4 flex-row justify-end gap-2">
            <Button
              text={t('Cancel')}
              mode="ghost"
              size="auto"
              onPress={onCancel}
              testID={`${testID}-cancel`}
            />
            <Button
              text={t('Delete')}
              mode="danger"
              size="auto"
              submitting={pending}
              onPress={onConfirm}
              testID={`${testID}-confirm`}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
