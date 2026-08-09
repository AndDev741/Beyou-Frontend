import { useState, type ReactElement } from 'react';
import { View, ScrollView, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

/**
 * Widget carousel — the same as the web at phone width: one at a time, with page
 * dots. Stacked, every new widget pushed the routine further down; here the
 * block's height does not grow with the list.
 *
 * The width comes from `onLayout` and not from `Dimensions`: the block lives inside
 * the dashboard's padding, so the full screen would make the slide too wide.
 */
export default function WidgetCarousel({
  children,
  testID,
}: {
  children: ReactElement[];
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    setActive(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={onLayout} testID={testID}>
      {/* Before the first measure there is no way to size a slide; render only
          o primeiro widget para não piscar uma pilha de largura zero. */}
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
        >
          {children.map((child, index) => (
            <View key={index} style={{ width }}>
              {child}
            </View>
          ))}
        </ScrollView>
      ) : (
        children[0]
      )}

      {children.length > 1 && (
        <View className="mt-2.5 flex-row justify-center gap-1.5">
          {children.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${index === active ? 'w-4 bg-accent' : 'w-1.5 bg-border'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
