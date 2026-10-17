import { useContext } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import { DEFAULT_DIAGRAM_WIDTH } from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { ModalToastHost } from '../../ui/BeyouToast';
import DiagramNative from './DiagramNative';
import { diagramMeta, diagramTitle } from './diagramCopy';

/**
 * A diagram on the whole screen, at full size, panned in both directions.
 *
 * It is laid out for the web's width rather than the phone's: the app is portrait only, so this
 * is the one place a phone shows the wide forms (a flow across, a map as a tree), and the reason
 * to open it is to see more than the card could fit.
 */
export default function DiagramFullscreen({
  spec,
  visible,
  onClose,
}: {
  spec: DiagramSpec | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const { width: windowWidth } = useWindowDimensions();

  // RN Modal mounts its children even when hidden (always, under jest).
  if (!visible || !spec) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: insets?.top ?? 0, paddingBottom: insets?.bottom ?? 0 }}
        testID="diagram-fullscreen"
      >
        <View className="flex-row items-center gap-2 border-b border-border bg-surface px-3 py-2">
          <View className="min-w-0 flex-1 px-1">
            <Text accessibilityRole="header" numberOfLines={1} className="text-[16px] font-semibold text-text">
              {diagramTitle(spec, t)}
            </Text>
            <Text className="text-[12px] text-text-2">{diagramMeta(spec, t)}</Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('DiagramCloseFullscreen')}
            className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface active:bg-surface-2"
            testID="diagram-fullscreen-close"
          >
            <X size={20} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView className="flex-1" testID="diagram-fullscreen-scroll">
          <ScrollView horizontal contentContainerStyle={{ minWidth: windowWidth, padding: 16, justifyContent: 'center' }}>
            <DiagramNative
              spec={spec}
              width={Math.max(windowWidth - 32, DEFAULT_DIAGRAM_WIDTH)}
              fit={false}
              testID="diagram-fullscreen-art"
            />
          </ScrollView>
        </ScrollView>
      </View>
      {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
      <ModalToastHost />
    </Modal>
  );
}
