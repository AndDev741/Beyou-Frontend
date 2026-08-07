import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  /** Linha de apoio abaixo do controle (mono, como na web). */
  hint?: string;
  className?: string;
  testID?: string;
}

/**
 * Rótulo, controle e erro na tipografia dos formulários da web: rótulo em
 * 12.5px semibold no `text-2`, erro em 12px no `danger`.
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
