import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  /** Required: the button has no visible text. */
  label: string;
  tone?: 'default' | 'danger';
  /** `sm` is for two buttons stacked in one row's height (the section order arrows). */
  size?: 'md' | 'sm';
  className?: string;
  testID?: string;
}

/** A quiet action (edit, delete, close). Always with an accessible label. */
export default function IconButton({
  children,
  label,
  tone = 'default',
  size = 'md',
  className = '',
  disabled,
  testID,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      className={`${size === 'sm' ? 'h-6 w-7' : 'h-8 w-8'} items-center justify-center rounded-control ${
        tone === 'danger' ? 'active:bg-danger/10' : 'active:bg-surface-2'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
