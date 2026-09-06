import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import FieldLabel, { type FieldMarkerProps } from './FieldLabel';

interface FormFieldProps extends FieldMarkerProps {
  label: string;
  children: ReactNode;
  error?: string;
  /** A supporting line below the control (mono, as on the web). */
  hint?: string;
  className?: string;
  testID?: string;
}

/**
 * Label, control and error in the typography of the web's forms: the label at 12.5px
 * semibold in `text-2`, the error at 12px in `danger`.
 */
export default function FormField({
  label,
  required,
  optional,
  children,
  error,
  hint,
  className = '',
  testID,
}: FormFieldProps) {
  return (
    <View className={className} testID={testID}>
      <FieldLabel required={required} optional={optional}>
        {label}
      </FieldLabel>
      {children}
      {hint ? <Text className="mt-1.5 font-mono text-[10.5px] text-text-3">{hint}</Text> : null}
      {error ? <Text className="mt-1.5 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
