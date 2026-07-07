import { useContext, type ReactNode } from 'react';
import { Modal, View, Pressable, KeyboardAvoidingView } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-height class for the panel; pass '' for no cap. */
  maxHeight?: string;
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
  maxHeight = 'max-h-[85%]',
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
        <KeyboardAvoidingView behavior="padding">
          <View
            className={`${maxHeight} rounded-t-2xl bg-background px-4 pt-4`}
            style={{ paddingBottom: (insets?.bottom ?? 0) + 16 }}
          >
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
