import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/ThemeContext";
import { accentPacks, buildTheme, type ThemeMode } from "@beyou/theme";
import editUser from "@beyou/api/user/editUser";
import { useDispatch } from "react-redux";
import { themeInUseEnter } from "@beyou/state/user/perfilSlice";

const MODES: { value: ThemeMode; labelKey: string }[] = [
    { value: "system", labelKey: "ThemeModeSystem" },
    { value: "light", labelKey: "ThemeModeLight" },
    { value: "dark", labelKey: "ThemeModeDark" },
];

/**
 * Aparência = modo (sistema/claro/escuro) + pack de acento, no lugar dos 9
 * temas soltos. As duas escolhas viajam juntas numa string só ("dark:cyber"),
 * que é o que o backend guarda em `themeInUse`.
 */
export default function ThemeSelector() {
    const { t } = useTranslation();
    const { theme, preference, setPreference } = useTheme();
    const dispatch = useDispatch();

    const apply = (next: { mode: ThemeMode; accentPack: string }) => {
        setPreference(next);
        const resolved = buildTheme(next, theme.base === "dark");
        dispatch(themeInUseEnter(resolved));
        editUser({ theme: resolved.mode });
    };

    return (
        <div className="flex w-full flex-col gap-5">
            <div>
                <p className="mb-2 text-sm font-semibold text-text-2">{t("ThemeMode")}</p>
                <div
                    role="radiogroup"
                    aria-label={t("ThemeMode")}
                    className="inline-flex rounded-control bg-surface-2 p-1"
                >
                    {MODES.map(({ value, labelKey }) => {
                        const isActive = preference.mode === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                onClick={() => apply({ ...preference, mode: value })}
                                className={`rounded-[7px] px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                                    isActive
                                        ? "bg-surface text-text shadow-sm"
                                        : "text-text-2 hover:text-text"
                                }`}
                            >
                                {t(labelKey)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="mb-2 text-sm font-semibold text-text-2">{t("ThemeAccent")}</p>
                <div className="flex flex-wrap gap-2">
                    {accentPacks.map((pack) => {
                        const isActive = preference.accentPack === pack.id;
                        return (
                            <button
                                key={pack.id}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => apply({ ...preference, accentPack: pack.id })}
                                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                                    isActive
                                        ? "border-accent bg-accent-soft text-text"
                                        : "border-border text-text-2 hover:text-text"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="h-4 w-4 rounded-full"
                                    style={{ background: pack.accent[theme.base] }}
                                />
                                {t(pack.labelKey)}
                            </button>
                        );
                    })}
                </div>
                <p className="mt-3 text-xs text-text-3">{t("ThemeHint")}</p>
            </div>
        </div>
    )
}
