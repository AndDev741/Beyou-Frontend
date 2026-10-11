import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, RotateCw } from 'lucide-react-native';
import { blockFigure, blockTitle, factsOfBlock, isClosed } from '@beyou/state';
import type { StudyBlock } from '@beyou/types/notebook/studyCycle';
import Chip from '../../ui/Chip';
import IconButton from '../../ui/IconButton';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import FigureBar, { FIGURE_TEXT } from './FigureBar';
import { blockSubline, figureText } from './cycleText';

/** Where the block stands against today's slice: the one to study now, later today, or neither. */
export type TodayBadge = 'next' | 'today' | null;

interface BlockRowProps {
  block: StudyBlock;
  badge: TodayBadge;
  /** For a turn that ran out: the block its concept comes back in, null when that is next lap. */
  nextPosition: number | null;
  /** Shows the move arrows instead of opening the block. */
  reordering: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
  onPress: () => void;
  onMove: (direction: -1 | 1) => void;
}

/**
 * One block of the lap on the cycle screen: its number (a tick once closed), the title with its
 * kind and today's badge, where the concept comes from, and under it the figure the shared
 * `blockFigure` gives, so the phone says what the web and the notebook card say.
 */
export default function BlockRow({
  block, badge, nextPosition, reordering, canMoveUp, canMoveDown, busy, onPress, onMove,
}: BlockRowProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const state = block.progress.state;
  const closed = isClosed(state);
  const current = badge === 'next';
  const figure = blockFigure(factsOfBlock(block), { nextPosition, current });
  const { label, caption } = figureText(figure, t);
  const sub = blockSubline({ ...block, target: block.progress.target }, t);

  const number = (
    <View
      className={`h-7 w-7 items-center justify-center rounded-full ${
        state === 'TURN_USED' ? 'bg-surface-2' : closed ? 'bg-success/10' : current ? 'bg-accent' : 'bg-surface-2'
      }`}
    >
      {state === 'TURN_USED' ? (
        <RotateCw size={14} color={theme.text2} />
      ) : closed ? (
        <Check size={15} color={theme.success} />
      ) : (
        <Text className={`font-mono-semibold text-[12px] ${current ? 'text-on-accent' : 'text-text-2'}`}>{block.position}</Text>
      )}
    </View>
  );

  const body = (
    <View className="min-w-0 flex-1 gap-1.5">
      <View className="flex-row flex-wrap items-center gap-1.5">
        <Text className="shrink text-[14.5px] font-semibold text-text">{blockTitle(factsOfBlock(block), t)}</Text>
        <Chip size="sm" variant={block.mode === 'GOAL' ? 'accent' : 'neutral'}>
          {t(block.mode === 'GOAL' ? 'StudyCycleMobileModeGoal' : 'StudyCycleMobileModeTime')}
        </Chip>
        {badge ? (
          <Chip size="sm" variant="accent" testID="block-row-badge">
            {t(badge === 'next' ? 'StudyCycleMobileBadgeNext' : 'StudyCycleMobileBadgeToday')}
          </Chip>
        ) : null}
      </View>
      {sub ? <Text className="text-[12px] leading-4 text-text-2">{sub}</Text> : null}
      {reordering ? null : (
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <FigureBar share={figure.share} tone={figure.tone} />
            </View>
            <Text className={`text-[12px] font-semibold ${FIGURE_TEXT[figure.tone]}`} testID="block-row-figure">
              {label}
            </Text>
          </View>
          {caption ? <Text className="text-[11.5px] text-text-3">{caption}</Text> : null}
        </View>
      )}
    </View>
  );

  const frame = `flex-row items-start gap-3 rounded-xl border p-3 ${
    current ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'
  } ${closed ? 'opacity-75' : ''}`;

  if (reordering) {
    return (
      <View className={frame} testID="block-row">
        {number}
        {body}
        <View className="gap-1">
          <IconButton label={t('StudyCycleMobileMoveUp')} disabled={!canMoveUp || busy} onPress={() => onMove(-1)} testID="block-row-up">
            <ChevronUp size={18} color={theme.text2} />
          </IconButton>
          <IconButton label={t('StudyCycleMobileMoveDown')} disabled={!canMoveDown || busy} onPress={() => onMove(1)} testID="block-row-down">
            <ChevronDown size={18} color={theme.text2} />
          </IconButton>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`${frame} active:opacity-80`} testID="block-row">
      {number}
      {body}
    </Pressable>
  );
}
