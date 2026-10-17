import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft,
  BookOpen,
  FilePlusCorner,
  GitCommitHorizontal,
  Layers,
  Maximize2,
  Network,
  RefreshCw,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react-native';
import type { DiagramKind, DiagramSpec } from '@beyou/types/notebook/diagram';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import Chip from '../../ui/Chip';
import IconTile from '../../ui/IconTile';
import DiagramFullscreen from './DiagramFullscreen';
import DiagramNative from './DiagramNative';
import { diagramMeta, diagramTitle } from './diagramCopy';

const KIND_ICONS: Record<DiagramKind, LucideIcon> = {
  FLOW: Workflow,
  MAP: Network,
  CYCLE: RefreshCw,
  SEQUENCE: ArrowRightLeft,
  LAYERS: Layers,
  TIMELINE: GitCommitHorizontal,
};

/** Card padding (p-3) plus the drawing's inset (px-0.5), on both sides. */
const CARD_INSET = 2 * 12 + 2 * 2;

/**
 * A diagram an AI answer drew, as a card: the title with its kind and size, where it came from,
 * the drawing, "Save to page" when the caller can save it, and full screen.
 *
 * `width` is for a parent sized by its content, a chat bubble: the drawing is laid out for the
 * width it gets, and a bubble only gets as wide as what is in it, so measuring there would shrink
 * the diagram step by step. Without it the card fills its column and measures that.
 */
export default function DiagramCard({
  spec,
  source,
  width,
  onSave,
  saving = false,
  testID = 'diagram-card',
}: {
  spec: DiagramSpec;
  /** "From your notes" or "From the AI's own knowledge"; no chip when null. */
  source?: 'notes' | 'ai' | null;
  width?: number;
  onSave?: () => void;
  saving?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(false);
  const KindIcon = KIND_ICONS[spec.kind];

  return (
    <View
      className="gap-2.5 rounded-card border border-border bg-surface p-3"
      style={width ? { width } : undefined}
      testID={testID}
    >
      <View className="flex-row items-center gap-2">
        <IconTile size={28}>
          <KindIcon size={15} color={theme.accentStrong} />
        </IconTile>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-text" numberOfLines={2}>
            {diagramTitle(spec, t)}
          </Text>
          <Text className="text-[12px] text-text-2">{diagramMeta(spec, t)}</Text>
        </View>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('DiagramFullscreen')}
          className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface active:bg-surface-2"
          testID={`${testID}-fullscreen`}
        >
          <Maximize2 size={16} color={theme.text} />
        </Pressable>
      </View>

      {source ? (
        <View className="flex-row">
          {source === 'notes' ? (
            <Chip variant="ok" icon={<BookOpen size={12} color={theme.success} />} testID={`${testID}-from-notes`}>
              {t('DiagramFromNotes')}
            </Chip>
          ) : (
            <Chip variant="neutral" icon={<Sparkles size={12} color={theme.text2} />} testID={`${testID}-from-ai`}>
              {t('DiagramFromAi')}
            </Chip>
          )}
        </View>
      ) : null}

      <View className="rounded-control bg-bg px-0.5 py-1.5">
        <DiagramNative spec={spec} width={width ? width - CARD_INSET : undefined} testID={`${testID}-art`} />
      </View>

      {onSave ? (
        <Pressable
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
          className={`h-[46px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-accent active:bg-accent-strong ${
            saving ? 'opacity-70' : ''
          }`}
          testID={`${testID}-save`}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.onAccent} />
          ) : (
            <FilePlusCorner size={17} color={theme.onAccent} />
          )}
          <Text className="text-[15px] font-semibold text-on-accent">{t('DiagramSaveToPage')}</Text>
        </Pressable>
      ) : null}

      <DiagramFullscreen spec={spec} visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
