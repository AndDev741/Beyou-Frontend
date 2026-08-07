import { useCallback, useEffect, useState } from 'react';
import { loadDismissed, saveDismissed } from '../lib/dismissedStore';

/**
 * Convites que o usuário já recusou não voltam.
 *
 * Diferente da web, o armazenamento aqui é assíncrono — então o estado começa
 * DISPENSADO e só libera depois da leitura. Ao contrário, um convite recusado
 * piscaria na tela a cada abertura do app.
 */
export function useDismissed(key: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let active = true;
    loadDismissed(key).then((stored) => {
      if (active) setDismissed(stored);
    });
    return () => {
      active = false;
    };
  }, [key]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void saveDismissed(key);
  }, [key]);

  return [dismissed, dismiss];
}
