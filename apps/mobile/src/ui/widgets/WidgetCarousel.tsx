import { useState, type ReactElement } from 'react';
import { View, ScrollView, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

/**
 * Carrossel de widgets — o mesmo da web no telefone: um por vez, com pontos de
 * página. Empilhados, cada widget novo empurrava a rotina para baixo; aqui a
 * altura do bloco não cresce com a lista.
 *
 * A largura vem do `onLayout` e não de `Dimensions`: o bloco vive dentro do
 * padding do dashboard, então a tela inteira daria um slide largo demais.
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
      {/* Antes da primeira medida não dá para dimensionar o slide; renderiza só
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
