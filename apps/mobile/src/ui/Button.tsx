import type { ReactNode } from 'react';
import { Pressable, Text, ActivityIndicator, View, type PressableProps } from 'react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

type Mode = 'primary' | 'tonal' | 'ghost' | 'danger' | 'cancel' | 'create' | 'default';
type Size = 'big' | 'medium' | 'small' | 'auto';

interface Props extends Omit<PressableProps, 'children'> {
  text: string;
  mode?: Mode;
  size?: Size;
  submitting?: boolean;
  icon?: ReactNode;
  /**
   * Classes extras (largura, alinhamento). Precisa ser DESTRUTURADA: caindo no
   * `...rest` ela substituía a className calculada e o botão perdia o fundo.
   */
  className?: string;
  testID?: string;
}

/**
 * Os quatro modos do sistema: primário (a ação da tela), tonal (secundária de
 * peso), ghost (discreta) e destrutivo.
 *
 * `cancel`, `create` e `default` são os nomes antigos, mantidos porque 19
 * arquivos importam este botão; cada um aponta para o modo novo equivalente e
 * some conforme as telas migram.
 */
const MODE: Record<Mode, string> = {
  primary: 'bg-accent active:bg-accent-strong',
  tonal: 'bg-accent-soft active:opacity-80',
  ghost: 'bg-transparent active:bg-surface-2',
  danger: 'bg-danger/10 active:opacity-80',
  // aliases do modelo antigo
  cancel: 'bg-surface-2 active:opacity-80',
  create: 'bg-accent active:bg-accent-strong',
  default: 'bg-surface border border-border active:bg-surface-2',
};

const MODE_TEXT: Record<Mode, string> = {
  primary: 'text-on-accent',
  tonal: 'text-accent',
  ghost: 'text-text-2',
  danger: 'text-danger',
  cancel: 'text-text-2',
  create: 'text-on-accent',
  default: 'text-text',
};

// Ao contrário da web, a largura fixa FICA: as telas nativas empilham o CTA numa
// coluna centrada e um botão que encolhe com o texto quebraria esse ritmo.
// `auto` é a saída para quem quiser o comportamento da web (cresce com o texto).
const SIZE: Record<Size, string> = {
  big: 'w-[250px] h-[52px]',
  medium: 'w-[180px] h-[48px]',
  small: 'w-[120px] h-[44px]',
  auto: 'h-11 px-6',
};

export default function Button({
  text,
  mode = 'create',
  size = 'big',
  submitting,
  disabled,
  icon,
  className = '',
  testID,
  ...rest
}: Props) {
  const { theme } = useBeyouTheme();
  const isDisabled = disabled || submitting;
  // O spinner só pode ser onAccent sobre o acento cheio; nos modos claros ele
  // sumiria — por isso cai no acento.
  const spinner = mode === 'primary' || mode === 'create' ? theme.onAccent : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!submitting }}
      testID={testID}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-control ${MODE[mode]} ${
        SIZE[size]
      } ${isDisabled ? 'opacity-60' : ''} ${className}`}
      {...rest}
    >
      {submitting ? (
        <ActivityIndicator color={spinner} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={`${MODE_TEXT[mode]} text-lg font-semibold`}>{text}</Text>
        </>
      )}
    </Pressable>
  );
}
