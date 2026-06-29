import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "../../context/ThemeContext";
import { themeInUseEnter } from "@beyou/state/user/perfilSlice";
import { themes } from "@beyou/theme";

export default function ThemeSelectorInline() {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();
    const dispatch = useDispatch();

    // Login page only: no user is authenticated, so don't hit the user API —
    // just apply the theme locally.
    const onSubmit = (nextTheme: typeof themes[0]) => {
        dispatch(themeInUseEnter(nextTheme));
        setTheme(nextTheme);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            {themes.map((item) => {
                const isActive = theme.mode === item.mode;
                return (
                    <button
                        key={item.mode}
                        type="button"
                        aria-label={t(item.mode)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform duration-200 hover:scale-105 ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                        style={{
                            background: `linear-gradient(90deg, ${item.background} 50%, ${item.primary} 50%)`,
                            borderColor: item.primary
                        }}
                        onClick={() => onSubmit(item)}
                    />
                );
            })}
        </div>
    );
}
