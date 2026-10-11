import { View } from 'react-native';
import type { BlockFigure } from '@beyou/state';

const FILL: Record<BlockFigure['tone'], string> = {
  done: 'bg-success',
  active: 'bg-accent',
  idle: 'bg-accent',
  muted: 'bg-text-3',
};

/** Text colour for a figure's main line, by its tone. */
export const FIGURE_TEXT: Record<BlockFigure['tone'], string> = {
  done: 'text-success',
  active: 'text-accent',
  idle: 'text-text',
  muted: 'text-text-2',
};

/**
 * The thin bar under a block's figure, coloured by the figure's tone: green once the block is
 * closed, grey for a turn that ran out. Decorative: the text beside it is what a reader hears.
 */
export default function FigureBar({ share, tone, testID }: { share: number; tone: BlockFigure['tone']; testID?: string }) {
  const width = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` as const;
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-surface-2" testID={testID}>
      <View className={`h-full rounded-full ${FILL[tone]}`} style={{ width }} />
    </View>
  );
}
