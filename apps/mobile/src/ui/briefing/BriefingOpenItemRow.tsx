import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, SkipForward } from 'lucide-react-native';
import type { BriefingOpenItem } from '@beyou/types/briefing/briefing';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import BeyouIcon from '../BeyouIcon';
import IconTile from '../IconTile';

interface Props {
  item: BriefingOpenItem;
  onCheck: () => void;
  onSkip: () => void;
  busy: boolean;
}

/**
 * The native twin of the web's `OpenItemRow`, down to the copy keys.
 *
 * The XP value is here for the same reason it is there: a late check pays less, and a
 * number that shrinks without explanation reads as a bug rather than as the rule.
 *
 * Hit targets are 40dp rather than the web's 36: a thumb is not a cursor, and the two
 * actions sit next to each other.
 */
export default function BriefingOpenItemRow({ item, onCheck, onSkip, busy }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const worthNothing = item.xpIfCheckedNow < 1;

  return (
    <View
      testID="briefing-open-item"
      className="flex-row items-center gap-3 rounded-control border border-border bg-surface px-3 py-2.5"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <IconTile tone="neutral" size={36}>
        <BeyouIcon id={item.itemIconId} size={18} color={theme.text2} showFallback />
      </IconTile>

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-text">
          {item.itemName}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-text-3">
          {item.sectionName}
          <Text className="text-border"> | </Text>
          <Text style={worthNothing ? undefined : { color: theme.xp }}>
            {worthNothing
              ? t('BriefingWorthNothingNow')
              : t('BriefingWorthNow', { xp: Math.round(item.xpIfCheckedNow) })}
          </Text>
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={onSkip}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('BriefingSkipItem', { name: item.itemName })}
          testID="briefing-skip"
          className="h-10 w-10 items-center justify-center rounded-control active:bg-surface-2"
        >
          <SkipForward size={17} color={theme.text3} />
        </Pressable>
        <Pressable
          onPress={onCheck}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('BriefingCheckItem', { name: item.itemName })}
          testID="briefing-check"
          className="h-10 w-10 items-center justify-center rounded-control bg-accent-soft active:opacity-70"
        >
          <Check size={18} color={theme.accent} />
        </Pressable>
      </View>
    </View>
  );
}
