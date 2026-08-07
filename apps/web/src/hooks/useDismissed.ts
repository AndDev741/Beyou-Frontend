import { useCallback, useState } from "react";

const STORAGE_PREFIX = "beyou-dismissed:";

/**
 * Convites que o usuário já recusou não voltam. Guardado no localStorage e não
 * no perfil de propósito: é preferência de tela, não dado de conta, e não vale
 * uma ida ao backend.
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
            // Sem persistência, o convite volta no próximo carregamento — o
            // fechamento desta sessão continua valendo.
        }
    }, [storageKey]);

    return [dismissed, dismiss];
}
