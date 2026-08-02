import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  /** Obrigatório: o botão não tem texto visível. */
  label: string;
  tone?: 'default' | 'danger';
  className?: string;
  testID?: string;
}

/** Ação discreta (editar, excluir, fechar). Sempre com rótulo acessível. */
export default function IconButton({
  children,
  label,
  tone = 'default',
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
      className={`h-8 w-8 items-center justify-center rounded-control ${
        tone === 'danger' ? 'active:bg-danger/10' : 'active:bg-surface-2'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
