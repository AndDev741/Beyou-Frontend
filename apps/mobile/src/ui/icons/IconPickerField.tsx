import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getEntryById } from '@beyou/icons';
import BeyouIcon from '../BeyouIcon';
import IconPicker from './IconPicker';
import FieldLabel from '../form/FieldLabel';

interface IconPickerFieldProps {
  label: string;
  /** The field's standing above the control, see FieldLabel. */
  required?: boolean;
  optional?: boolean;
  value?: string | null;
  onChange: (iconId: string) => void;
  error?: string;
  testID?: string;
}

/**
 * Labeled form field showing the currently selected icon; tapping opens the
 * bottom-sheet IconPicker. Used by the habit (and later category/routine) forms.
 */
export default function IconPickerField({ label, required, optional, value, onChange, error, testID }: IconPickerFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const entry = value ? getEntryById(value) : null;

  return (
    <View className="w-full">
      <FieldLabel required={required} optional={optional}>
        {label}
      </FieldLabel>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        className={`min-h-[42px] flex-row items-center gap-2.5 rounded-control border bg-surface px-3 py-2 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <View className="h-7 w-7 items-center justify-center">
          {value ? (
            <BeyouIcon id={value} size={22} showFallback />
          ) : (
            <BeyouIcon id="lucide:image" size={19} />
          )}
        </View>
        <Text className="text-[13.5px] text-text-2">{entry?.label ?? t('Icon')}</Text>
      </Pressable>
      {error ? <Text className="mt-1.5 text-xs text-danger">{error}</Text> : null}
      <IconPicker
        visible={open}
        selectedIcon={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
