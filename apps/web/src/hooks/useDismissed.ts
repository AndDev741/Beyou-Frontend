import { useCallback, useState } from "react";

const STORAGE_PREFIX = "beyou-dismissed:";

/**
 * Invitations the user has already dismissed do not come back. Kept in localStorage
 * and not in the profile on purpose: it is a screen preference, not account data, and
 * is not worth a round trip to the backend.
 */
export function useDismissed(key: string): [boolean, () => void] {
    const storageKey = `${STORAGE_PREFIX}${key}`;

    const [dismissed, setDismissed] = useState(() => {
        try {
            return window.localStorage.getItem(storageKey) === "1";
        } catch {
            // Modo privado de alguns navegadores derruba o acesso ao storage.
            return false;
        }
    });

    const dismiss = useCallback(() => {
        setDismissed(true);
        try {
            window.localStorage.setItem(storageKey, "1");
        } catch {
            // With no storage the invitation returns on the next load — the dismissal
            // still holds for this session.
        }
    }, [storageKey]);

    return [dismissed, dismiss];
}
