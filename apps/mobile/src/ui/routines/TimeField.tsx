import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

const pad = (n: number) => String(n).padStart(2, '0');

export const toHHmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * @warning The returned Date's DATE portion is today (a throwaway base) and must NOT be used
 * for absolute or cross-midnight comparison — only the time portion (hours/minutes) is meaningful.
 */
export const hhmmToDate = (hhmm: string): Date => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

interface TimeFieldProps {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  testID?: string;
}

export default function TimeField({ label, value, onChange, testID }: TimeFieldProps) {
  const [show, setShow] = useState(false);

  const handle = (e: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (e.type === 'set' && date) onChange(toHHmm(date));
  };

  return (
    <View className="flex-1">
      {label ? (
        <Text className="text-secondary mb-1 text-sm font-semibold">{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        testID={testID}
        className="h-[44px] justify-center rounded-md border-2 border-primary bg-background px-3"
      >
        <Text className={value ? 'text-secondary' : 'text-placeholder'}>{value || '--:--'}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={hhmmToDate(value)}
          mode="time"
          is24Hour
          display="default"
          onChange={handle}
          testID={testID ? `${testID}-picker` : undefined}
        />
      ) : null}
    </View>
  );
}
