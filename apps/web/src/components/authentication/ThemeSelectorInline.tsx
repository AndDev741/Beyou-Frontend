import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "../../context/ThemeContext";
import { themeInUseEnter } from "@beyou/state/user/perfilSlice";
import { accentPacks, buildTheme, type ThemeMode } from "@beyou/theme";

const MODES: { value: ThemeMode; labelKey: string }[] = [
    { value: "light", labelKey: "ThemeModeLight" },
    { value: "dark", labelKey: "ThemeModeDark" },
];

/**
 * Versão enxuta da Aparência para a tela de login: alterna claro/escuro e
 * escolhe o acento. Ninguém está autenticado aqui, então a escolha só vale
 * localmente (o ThemeProvider persiste no localStorage) e é carregada para a
 * conta quando ela nascer sem tema próprio.
 */
export default function ThemeSelectorInline() {
    const { t } = useTranslation();
    const { theme, preference, setPreference } = useTheme();
    const dispatch = useDispatch();

    const apply = (next: { mode: ThemeMode; accentPack: string }) => {
        setPreference(next);
        dispatch(themeInUseEnter(buildTheme(next, theme.base === "dark")));
    };

    return (
        <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="inline-flex rounded-control bg-surface-2 p-1">
                {MODES.map(({ value, labelKey }) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={theme.base === value}
                        aria-label={t(labelKey)}
                        onClick={() => apply({ ...preference, mode: value })}
                        className={`rounded-[7px] px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                            theme.base === value
                                ? "bg-surface text-text shadow-sm"
                                : "text-text-2 hover:text-text"
                        }`}
                    >
                        {t(labelKey)}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-1.5">
                {accentPacks.map((pack) => (
                    <button
                        key={pack.id}
                        type="button"
                        aria-label={t(pack.labelKey)}
                        aria-pressed={preference.accentPack === pack.id}
                        onClick={() => apply({ ...preference, accentPack: pack.id })}
                        className={`h-6 w-6 rounded-full transition-transform duration-200 hover:scale-105 ${
                            preference.accentPack === pack.id
                                ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                                : ""
                        }`}
                        style={{ background: pack.accent[theme.base] }}
                    />
                ))}
            </div>
        </div>
    );
}
