const STORAGE_KEY = "beyou.iconRecents";
const MAX_RECENTS = 12;

const safeParse = (value: string | null): string[] => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [];
    }
};

export const getRecentIconIds = (): string[] => {
    if (typeof window === "undefined") return [];
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const pushRecentIconId = (id: string) => {
    if (typeof window === "undefined") return;
    const current = getRecentIconIds();
    const next = [id, ...current.filter((item) => item !== id)].slice(0, MAX_RECENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const clearRecentIcons = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
};
