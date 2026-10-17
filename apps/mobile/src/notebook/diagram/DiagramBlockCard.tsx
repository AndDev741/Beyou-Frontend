import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZoomIn } from 'lucide-react-native';
import { diagramText, parseDiagramProp, sanitizeDiagram } from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import DiagramFullscreen from './DiagramFullscreen';
import DiagramNative from './DiagramNative';
import { diagramTitle } from './diagramCopy';

/**
 * A page's diagram block in the native reader: the title, "Tap to zoom" and the diagram fitted to
 * the column. The whole card is the button that opens it on the full screen.
 *
 * The block's `spec` prop is cleaned again here (`parseDiagramProp`), since a document can hold a
 * block the server never saw. One that does not draw shows the "could not draw" box instead of
 * leaving a hole in the notes.
 */
export default function DiagramBlockCard({ spec: prop, testID = 'notebook-block-diagram' }: { spec: unknown; testID?: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(false);
  const spec = useMemo(() => (typeof prop === 'string' ? parseDiagramProp(prop) : sanitizeDiagram(prop)), [prop]);

  if (!spec) return <DiagramNative spec={null} testID={testID} />;

  const title = diagramTitle(spec, t);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('DiagramOpenFullscreen', { title })}
        // The card is one button, so the drawing's own label would be lost inside it.
        accessibilityHint={diagramText(spec)}
        className="gap-2.5 rounded-[14px] border border-border bg-surface p-3 active:bg-surface-2"
        testID={testID}
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 text-[15px] font-semibold text-text" numberOfLines={2}>
            {title}
          </Text>
          <View className="flex-row items-center gap-1">
            <ZoomIn size={14} color={theme.accentStrong} />
            <Text className="text-[12px] font-semibold text-accent-strong">{t('DiagramTapToZoom')}</Text>
          </View>
        </View>
        <View className="rounded-control bg-bg px-1 py-1.5">
          <DiagramNative spec={spec} testID={`${testID}-art`} />
        </View>
      </Pressable>
      <DiagramFullscreen spec={spec} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
