import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" (the wire format the goal API + schema expect). */
export const toYMD = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" → Date at local noon (noon dodges any timezone date-rollover). */
export const ymdToDate = (ymd: string): Date => {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y) return new Date();
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
};

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (ymd: string) => void;
  error?: string;
  testID?: string;
}

export default function DateField({ label, value, onChange, error, testID }: DateFieldProps) {
  const [show, setShow] = useState(false);

  const handle = (e: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (e.type === 'set' && date) onChange(toYMD(date));
  };

  return (
    <View className="flex-1">
      {label ? <Text className="text-secondary mb-1 text-sm font-semibold">{label}</Text> : null}
      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        testID={testID}
        className="h-[44px] justify-center rounded-md border-2 border-primary bg-background px-3"
      >
        <Text className={value ? 'text-secondary' : 'text-placeholder'}>{value || 'YYYY-MM-DD'}</Text>
      </Pressable>
      {error ? <Text className="text-error mt-1 text-sm">{error}</Text> : null}
      {show ? (
        <DateTimePicker
          value={ymdToDate(value)}
          mode="date"
          display="default"
          onChange={handle}
          testID={testID ? `${testID}-picker` : undefined}
        />
      ) : null}
    </View>
  );
}
