import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FieldLabel from '../form/FieldLabel';

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
  /** The field's standing above the control, see FieldLabel. */
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (hhmm: string) => void;
  /** No picker while true, e.g. while the value is being saved. */
  disabled?: boolean;
  testID?: string;
}

export default function TimeField({ label, required, optional, value, onChange, disabled = false, testID }: TimeFieldProps) {
  const [show, setShow] = useState(false);

  const handle = (e: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (e.type === 'set' && date) onChange(toHHmm(date));
  };

  return (
    <View className="flex-1">
      {label ? (
        <FieldLabel required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <Pressable
        onPress={() => setShow(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
        className={`min-h-[42px] justify-center rounded-control border border-border bg-surface px-3 ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        {/* The time in mono, like every time in the system. */}
        <Text className={`font-mono text-[13.5px] ${value ? 'text-text' : 'text-text-3'}`}>
          {value || '--:--'}
        </Text>
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
