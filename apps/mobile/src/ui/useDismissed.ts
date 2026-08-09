import { useCallback, useEffect, useState } from 'react';
import { loadDismissed, saveDismissed } from '../lib/dismissedStore';

/**
 * Invitations the user has already dismissed do not come back.
 *
 * Unlike the web, storage here is asynchronous — so the state starts DISMISSED and
 * only opens up after the read. The other way round, a dismissed invitation
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
