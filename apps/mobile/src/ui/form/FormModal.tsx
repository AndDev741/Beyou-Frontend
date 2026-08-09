import { useContext, type ReactNode } from 'react';
import { Modal, View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Button from '../Button';
import IconButton from '../IconButton';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface FormModalProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  /** The primary button's label ("Save habit"). */
  submitLabel: string;
  submitting?: boolean;
  testID?: string;
}

/**
 * The forms' shell, in the web's design: a header with the title and ×, a
 * scrollable body, and the footer with Cancel (ghost) before Save (primary), on the
 * right.
 *
 * Every form used to bring its own: Cancel as text in the header and a single
 * centred button at the end of the scroll — far from the thumb and without a
 * pair.
 */
export default function FormModal({
  visible,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel,
  submitting = false,
  testID,
}: FormModalProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-bg" style={{ paddingTop: insets?.top ?? 0 }} testID={testID}>
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <Text
            accessibilityRole="header"
            className="min-w-0 flex-1 text-base font-semibold tracking-[-0.01em] text-text"
            numberOfLines={1}
          >
            {title}
          </Text>
          <IconButton label={t('Close')} onPress={onClose} testID={testID ? `${testID}-close` : 'form-close'}>
            <X size={18} color={theme.text3} />
          </IconButton>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-4 pt-4 pb-4"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        <View
          className="flex-row justify-end gap-2 border-t border-border px-4 pt-3"
          style={{ paddingBottom: (insets?.bottom ?? 0) + 12 }}
        >
          <Button
            text={t('Cancel')}
            mode="ghost"
            size="auto"
            onPress={onClose}
            testID={testID ? `${testID}-cancel` : 'form-cancel'}
          />
          <Button
            text={submitLabel}
            mode="primary"
            size="auto"
            submitting={submitting}
            onPress={onSubmit}
            testID={testID ? `${testID}-submit` : 'form-submit'}
          />
        </View>
      </View>
    </Modal>
  );
}
