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
        {/* The cap lives HERE and there is only ONE. A percentage only resolves
            against a parent of definite height: on the panel it counted for
            nothing, and once it did count (85% on the container) a second cap on
            the panel became 70% OF 85% — the sheet shrank, came away from the
            bottom and showed the screen underneath. */}
        <KeyboardAvoidingView behavior="padding" style={{ maxHeight: '85%' }}>
          {/* `flexShrink` on the panel, or the cap above never reaches it: without
              shrinking it takes the size of its content and the footer (where the
              confirm button lives) drops off screen. */}
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
