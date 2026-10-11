import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

interface HeaderIconButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** A bordered tile, for a header that sits on the page background (the notebook home). */
  framed?: boolean;
  testID?: string;
  children: ReactNode;
}

/**
 * An icon action in a screen header, at the 44 px a thumb needs. `IconButton` is the quieter
 * 32 px one for rows; widening it with a class would leave two heights fighting in one class list.
 */
export default function HeaderIconButton({ label, onPress, disabled, framed, testID, children }: HeaderIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      className={`h-11 w-11 items-center justify-center rounded-xl active:bg-surface-2 ${framed ? 'border border-border bg-surface' : ''} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {children}
    </Pressable>
  );
}
