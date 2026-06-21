import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getEntryById } from '@beyou/icons';
import BeyouIcon from '../BeyouIcon';
import IconPicker from './IconPicker';

interface IconPickerFieldProps {
  label: string;
  value?: string | null;
  onChange: (iconId: string) => void;
  error?: string;
  testID?: string;
}

/**
 * Labeled form field showing the currently selected icon; tapping opens the
 * bottom-sheet IconPicker. Used by the habit (and later category/routine) forms.
 */
export default function IconPickerField({ label, value, onChange, error, testID }: IconPickerFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const entry = value ? getEntryById(value) : null;

  return (
    <View className="w-full">
      <Text className="text-secondary mb-1 text-base font-semibold">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        className={`h-[56px] flex-row items-center gap-3 rounded-md border-2 bg-background px-3 ${
          error ? 'border-error' : 'border-primary'
        }`}
      >
        <View className="h-8 w-8 items-center justify-center">
          {value ? (
            <BeyouIcon id={value} size={26} showFallback />
          ) : (
            <BeyouIcon id="lucide:image" size={22} />
          )}
        </View>
        <Text className="text-description text-sm">{entry?.label ?? t('Icon')}</Text>
      </Pressable>
      {error ? <Text className="text-error mt-1 text-sm">{error}</Text> : null}
      <IconPicker
        visible={open}
        selectedIcon={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
