import { View, Pressable, Text } from 'react-native';

interface Option<T extends string | number> {
  value: T;
  label: string;
  /** An option that is designed but not implemented yet — shows dimmed, never hidden. */
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
  testID?: string;
}

/**
 * A short single choice (importance, difficulty, experience, mode). Replaces the
 * pickers and the loose button rows every form used to reinvent.
 */
export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
  testID,
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      className={`flex-row rounded-control bg-surface-2 p-1 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isActive, checked: isActive, disabled: !!option.disabled }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-[7px] ${pad} ${isActive ? 'bg-surface' : ''} ${
              option.disabled ? 'opacity-50' : ''
            }`}
          >
            <Text
              className={`${fontSize} font-semibold ${isActive ? 'text-text' : 'text-text-2'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
