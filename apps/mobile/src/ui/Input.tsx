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
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(!!password);
  const { theme } = useBeyouTheme();

  return (
    <View className="w-full">
      <View
        className={`flex-row items-center border-2 rounded-md h-[56px] ${
          disabled ? 'bg-description/10' : 'bg-background'
        } ${error ? 'border-error' : disabled ? 'border-description/40' : 'border-primary'}`}
      >
        {iconStart ? <View className="mx-3">{iconStart}</View> : null}
        <TextInput
          className={`flex-1 text-lg px-2 ${disabled ? 'text-description' : 'text-secondary'}`}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={hidden}
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
          className="text-error text-sm mt-1"
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
