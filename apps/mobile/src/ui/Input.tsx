import { useState, type ReactNode } from 'react';
import { View, TextInput, Text, Pressable, type TextInputProps } from 'react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (v: string) => void;
  iconStart?: ReactNode;
  password?: boolean;
  error?: string;
  eyeOpen?: ReactNode;
  eyeClosed?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  /** Read-only + visually muted (e.g. the email field). */
  disabled?: boolean;
  /** Multi-line textarea (taller, top-aligned) — e.g. a description field. */
  multiline?: boolean;
  /**
   * A altura dos formulários (a da web): 1px de borda e 13.5px de texto. O
   * padrão continua sendo o campo alto das telas de autenticação, onde ele é
   * o único conteúdo da tela.
   */
  compact?: boolean;
  /** Rótulo visível acima do campo (padrão do sistema, igual à web). */
  label?: string;
}

export default function Input({
  value,
  onChangeText,
  iconStart,
  password,
  error,
  eyeOpen,
  eyeClosed,
  testID,
  accessibilityLabel,
  disabled,
  multiline,
  compact,
  label,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(!!password);
  const { theme } = useBeyouTheme();

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{label}</Text>
      ) : null}
      <View
        className={`flex-row rounded-control ${compact ? 'border' : 'border-2'} ${
          multiline
            ? compact
              ? 'min-h-[84px] items-start py-1'
              : 'min-h-[100px] items-start py-1'
            : compact
              ? 'min-h-[42px] items-center'
              : 'h-[56px] items-center'
        } ${disabled ? 'bg-description/10' : 'bg-surface'} ${
          error ? 'border-danger' : disabled ? 'border-border/40' : 'border-border'
        }`}
      >
        {iconStart ? <View className="mx-3">{iconStart}</View> : null}
        <TextInput
          className={`flex-1 ${compact ? 'px-3 py-2.5 text-[13.5px]' : 'px-2 text-lg'} ${
            disabled ? 'text-text-2' : 'text-text'
          }`}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={hidden && !multiline}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={theme.placeholder}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          {...rest}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            className="mx-3"
            accessibilityRole="button"
            testID={testID ? `${testID}-toggle` : undefined}
          >
            {hidden ? eyeClosed : eyeOpen}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          className="text-danger text-sm mt-1"
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
