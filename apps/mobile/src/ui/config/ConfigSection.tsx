import { useState, type ReactNode, type RefObject } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import IconTile from '../IconTile';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  /** Ícone do cartão, num tile de acento. */
  icon?: ReactNode;
  /** Substitui o título na linha fechada (o perfil mostra avatar, nome, nível). */
  header?: ReactNode;
  /** Começa aberta. */
  defaultOpen?: boolean;
  testID?: string;
  /** Alvo do spotlight do tutorial (fica na raiz do cartão). */
  viewRef?: RefObject<View | null>;
  /** Reporta o layout para o tutorial rolar a seção até a vista. */
  onLayout?: (e: LayoutChangeEvent) => void;
}

/**
 * Cada assunto da configuração é um cartão que abre ao toque — a página inteira
 * aberta dava umas seis rolagens até os widgets. Espelha o ConfigSection da
 * web abaixo de `lg`, que é exatamente o caso do celular.
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

        <ChevronDown
          size={18}
          color={theme.text3}
          style={{ transform: [{ rotate: open ? '180deg' : '-90deg' }] }}
        />
      </Pressable>

      {open ? <View className="mt-3.5 w-full">{children}</View> : null}
    </View>
  );
}
