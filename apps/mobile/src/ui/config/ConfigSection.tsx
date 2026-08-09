import { useState, type ReactNode, type RefObject } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import { ChevronRight, ChevronUp } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import IconTile from '../IconTile';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  /** The card's icon, in an accent tile. */
  icon?: ReactNode;
  /** Replaces the title on the closed row (profile shows avatar, name, level). */
  header?: ReactNode;
  /** Starts open. */
  defaultOpen?: boolean;
  testID?: string;
  /** Tutorial spotlight target (sits on the card root). */
  viewRef?: RefObject<View | null>;
  /** Reports its layout so the tutorial can scroll the section into view. */
  onLayout?: (e: LayoutChangeEvent) => void;
}

/**
 * Every configuration topic is a card that opens on tap — the whole page open took
 * about six scrolls to reach the widgets. Mirrors the web's ConfigSection below
 * `lg`, which is exactly the phone case.
 */
export default function ConfigSection({
  title,
  children,
  icon,
  header,
  defaultOpen = false,
  testID,
  viewRef,
  onLayout,
}: ConfigSectionProps) {
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      className="w-full rounded-card border border-border bg-surface p-4"
      testID={testID}
      ref={viewRef}
      onLayout={onLayout}
    >
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        testID={testID ? `${testID}-toggle` : undefined}
        className="w-full flex-row items-center gap-3"
      >
        {icon ? (
          <IconTile tone="accent" size={36}>
            {icon}
          </IconTile>
        ) : null}

        <View className="min-w-0 flex-1">
          {header ?? (
            <Text
              accessibilityRole="header"
              className="text-[14px] font-semibold tracking-[-0.01em] text-text"
            >
              {title}
            </Text>
          )}
        </View>

        {/* Icon swapped instead of rotated: `transform: rotate` in the style of a
            lucide-react-native icon makes the SVG vanish (react-native-svg does not
            accept the transform there), and the chevron simply never showed. */}
        {open ? (
          <ChevronUp size={18} color={theme.text3} />
        ) : (
          <ChevronRight size={18} color={theme.text3} />
        )}
      </Pressable>

      {open ? <View className="mt-3.5 w-full">{children}</View> : null}
    </View>
  );
}
