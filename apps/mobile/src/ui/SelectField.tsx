import { useState } from 'react';
import { Text, Pressable, ScrollView } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';
import BottomSheet from './BottomSheet';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  testID?: string;
  className?: string;
}

/**
 * O `<select>` da web, em RN: um controle com a mesma casca dos inputs, que
 * abre uma sheet de opções. Não existe select nativo estilizável no RN, e uma
 * lista rolável é mais confortável que um picker de roda numa lista longa.
 */
export default function SelectField({
  label,
  value,
  options,
  onChange,
  testID,
  className = '',
}: SelectFieldProps) {
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current?.label }}
        testID={testID}
        className={`min-w-0 flex-row items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-2.5 active:bg-surface-2 ${className}`}
      >
        <Text className="min-w-0 flex-1 text-[13.5px] text-text" numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <ChevronDown size={15} color={theme.text3} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} closeLabel="Close" maxHeight="max-h-[70%]">
        <Text accessibilityRole="header" className="mb-2 text-[15px] font-semibold text-text">
          {label}
        </Text>
        <ScrollView>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={testID ? `${testID}-option-${option.value}` : undefined}
                className="flex-row items-center justify-between py-3"
              >
                <Text className={selected ? 'font-semibold text-accent' : 'text-text'}>
                  {option.label}
                </Text>
                {selected ? <Check size={17} color={theme.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}
