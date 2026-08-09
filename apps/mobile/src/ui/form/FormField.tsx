import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface FormFieldProps {
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
  children,
  error,
  hint,
  className = '',
  testID,
}: FormFieldProps) {
  return (
    <View className={className} testID={testID}>
      <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{label}</Text>
      {children}
      {hint ? <Text className="mt-1.5 font-mono text-[10.5px] text-text-3">{hint}</Text> : null}
      {error ? <Text className="mt-1.5 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
