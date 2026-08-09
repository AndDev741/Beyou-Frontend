import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
    House,
    Folder,
    Repeat,
    ListChecks,
    CalendarDays,
    Trophy,
    Settings,
    MessageSquare,
    PanelLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import BrandMark from "../brand/BrandMark";
import { resolvePhotoUrl } from "../../services/photoUrl";

type Item = { key: string; to: string; Icon: LucideIcon; tutorial?: string };

/**
 * Order confirmed in the mockup: Today, Categories, Habits, Tasks, Routines,
 * Goals. Routines before Goals on purpose — the routine is what you do today, the
 * goal is why.
 */
const MAIN: Item[] = [
    { key: "NavDashboard", to: "/dashboard", Icon: House },
    { key: "Categories", to: "/categories", Icon: Folder, tutorial: "shortcut-categories" },
    { key: "Habits", to: "/habits", Icon: Repeat, tutorial: "shortcut-habits" },
    { key: "Tasks", to: "/tasks", Icon: ListChecks, tutorial: "shortcut-tasks" },
    { key: "Routines", to: "/routines", Icon: CalendarDays, tutorial: "shortcut-routines" },
    { key: "Goals", to: "/goals", Icon: Trophy, tutorial: "shortcut-goals" },
];

const FOOT: Item[] = [
    // This item replaces the floating feedback bubble (mockup v1.16); the
    // tutorial anchor came along from the launcher that died with it.
    { key: "FeedbackShortcutLabel", to: "/feedback", Icon: MessageSquare, tutorial: "shortcut-feedback" },
    { key: "Config", to: "/configuration", Icon: Settings, tutorial: "shortcut-configuration" },
];

const STORAGE_KEY = "beyou-sidebar-collapsed";

/**
 * The app's desktop navigation. Replaces the blue bar (`Header`) and the
 * dashboard's shortcut column (`Shortcuts`) with a persistent sidebar.
 *
 * The shortcuts' `data-tutorial-id` attributes moved here: the tutorial measures
 * the element by id, and without them `tutorial.spec.ts` breaks.
 */
export default function Sidebar() {
    const { t } = useTranslation();
    const perfil = useSelector((state: RootState) => state.perfil);
    // Guarded like every sibling write: a browser with storage blocked throws
    // SecurityError here, and an unguarded read in the initializer takes down
    // every authenticated page through the error boundary.
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "true";
        } catch {
            return false;
        }
    });

    const toggle = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
            } catch {
                /* storage unavailable — the choice lasts only for this session */
            }
            return next;
        });
    };

    const renderItem = ({ key, to, Icon, tutorial }: Item) => (
        <NavLink
            key={key}
            to={to}
            data-tutorial-id={tutorial}
            title={collapsed ? t(key) : undefined}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-control px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                        ? "bg-accent-soft text-accent"
                        : "text-text-2 hover:bg-surface-2 hover:text-text"
                } ${collapsed ? "justify-center px-0" : ""}`
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={18} className={isActive ? "text-accent" : "text-text-3"} aria-hidden="true" />
                    {/* Collapsed, the label leaves the flow but stays in the
                        DOM: o e2e seleciona os links por nome acessível. */}
                    <span className={collapsed ? "sr-only" : ""}>{t(key)}</span>
                </>
            )}
        </NavLink>
    );

    return (
        <aside
            data-tutorial-id="dashboard-shortcuts"
            aria-label={t("Shortcuts")}
            className={`hidden lg:flex sticky top-0 h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${
                collapsed ? "w-[62px] px-2" : "w-[232px] px-3"
            } py-4`}
        >
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1`}>
                <Link to="/dashboard" className="text-accent" aria-label="beyou">
                    <BrandMark size={collapsed ? 24 : 26} withWordmark={!collapsed} />
                </Link>
                {!collapsed && (
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={t("SidebarToggle")}
                        aria-expanded={!collapsed}
                        className="rounded-control p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text"
                    >
                        <PanelLeft size={16} aria-hidden="true" />
                    </button>
                )}
            </div>

            {collapsed && (
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={t("SidebarToggle")}
                    aria-expanded={!collapsed}
                    className="mt-3 self-center rounded-control p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text"
                >
                    <PanelLeft size={16} aria-hidden="true" />
                </button>
            )}

            <nav className="mt-6 flex flex-col gap-1">{MAIN.map(renderItem)}</nav>

            <div className="mt-auto flex flex-col gap-1">
                {FOOT.map(renderItem)}

                <Link
                    to="/configuration"
                    data-tutorial-id="dashboard-profile"
                    className={`mt-2 flex items-center gap-2.5 rounded-control border border-border p-2 transition-colors duration-200 hover:bg-surface-2 ${
                        collapsed ? "justify-center border-0 p-1" : ""
                    }`}
                >
                    {perfil.photo ? (
                        <img
                            src={resolvePhotoUrl(perfil.photo)}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                            {(perfil.username || "?").charAt(0).toUpperCase()}
                        </span>
                    )}
                    {!collapsed && (
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-text">
                                {perfil.username}
                            </span>
                            <span className="block font-mono text-[11px] text-text-3">
                                {t("Level")} {perfil.level}
                            </span>
                        </span>
                    )}
                </Link>
            </div>
        </aside>
    );
}
