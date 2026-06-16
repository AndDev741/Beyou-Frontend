import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';

type Mode = 'create' | 'cancel' | 'default';
type Size = 'big' | 'medium' | 'small';

interface Props extends Omit<PressableProps, 'children'> {
  text: string;
  mode?: Mode;
  size?: Size;
  submitting?: boolean;
  testID?: string;
}

const MODE: Record<Mode, string> = {
  create: 'bg-primary',
  cancel: 'bg-secondary/10 border border-primary',
  default: 'bg-background border border-description',
};

const SIZE: Record<Size, string> = {
  big: 'w-[250px] h-[52px]',
  medium: 'w-[180px] h-[48px]',
  small: 'w-[120px] h-[44px]',
};

const ON_PRIMARY = '#FFFFFF';

export default function Button({
  text,
  mode = 'create',
  size = 'big',
  submitting,
  disabled,
  testID,
  ...rest
}: Props) {
  const isDisabled = disabled || submitting;
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-[20px] ${MODE[mode]} ${SIZE[size]} ${isDisabled ? 'opacity-60' : ''}`}
      {...rest}
    >
      {submitting ? (
        <ActivityIndicator color={ON_PRIMARY} />
      ) : (
        <Text className="text-secondary text-lg font-semibold">{text}</Text>
      )}
    </Pressable>
  );
}
