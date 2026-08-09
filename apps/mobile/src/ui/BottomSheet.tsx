import { useContext, type ReactNode } from 'react';
import { Modal, View, Pressable, KeyboardAvoidingView } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** i18n key for the backdrop's accessibility label. */
  closeLabel?: string;
  /** When false, tapping the backdrop does nothing (e.g. a request is in flight). */
  dismissable?: boolean;
}

/**
 * Bottom-anchored modal panel shared by every sheet. Adds the device's bottom
 * safe-area inset so action buttons never sit under the Android nav bar.
 * Reads the inset via context (returns null without a provider → 0 in jest, so
 * tests need no safe-area mock).
 */
export default function BottomSheet({
  visible,
  onClose,
  children,
  closeLabel = 'Cancel',
  dismissable = true,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel={t(closeLabel)}
        />
        {/* O teto vive AQUI e é ÚNICO. Porcentagem só resolve contra um pai de
            altura definida: no painel ela não valia nada, e quando passou a
            valer (85% no contêiner) um segundo teto no painel virava 70% DE
            85% — a folha encolhia e descolava do rodapé, mostrando a tela por
            baixo. */}
        <KeyboardAvoidingView behavior="padding" style={{ maxHeight: '85%' }}>
          {/* `flexShrink` no painel, senão o teto acima não o alcança: sem
              encolher, ele fica do tamanho do conteúdo e o rodapé (onde mora o
              botão de concluir) desce para fora da tela. */}
          <View
            className="rounded-t-2xl bg-surface px-4 pt-4"
            style={{ flexShrink: 1, paddingBottom: (insets?.bottom ?? 0) + 16 }}
          >
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
