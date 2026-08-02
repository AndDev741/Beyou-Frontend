import { View, Pressable, Text } from 'react-native';

interface Option<T extends string | number> {
  value: T;
  label: string;
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
 * Escolha única e curta (importância, dificuldade, experiência, modo). Troca os
 * pickers e as fileiras de botões soltos que cada formulário reinventava.
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
            accessibilityState={{ selected: isActive, checked: isActive }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-[7px] ${pad} ${isActive ? 'bg-surface' : ''}`}
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
