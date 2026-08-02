import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Folder, ListChecks, Repeat, CalendarDays, Trophy, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { key: string; to: string; Icon: LucideIcon; tutorial: string };

// Mobile-only (lg:hidden) fixed action bar — mirrors the native app's BottomNav.
// Order: Categories · Tasks · Habits · Routines · Goals · Config. Desktop keeps
// the <Shortcuts/> sidebar.
//
// The filled-primary treatment marks WHERE YOU ARE — exactly one item at a time,
// and none on the dashboard, which has no entry in this bar. It used to be a
// static flag on Habits + Routines, which made the bar say the same thing on
// every route. `NavLink` owns the match (so a nested path like /routines/:id
// still lights Routines) and contributes aria-current="page" for free.
//
// Mounted by `ProtectedRoute`, NOT by any page: on mobile this bar is the
// shortcuts affordance for every authenticated route, so a user can move
// sideways in one tap instead of routing back through the dashboard. The
// clearance spacer that stops the fixed bar covering page content is mounted
// alongside it there. Six items is the agreed shape — a seventh (feedback) has
// been declined twice; feedback is reached via Config, which carries the bubble.
const ITEMS: NavItem[] = [
    { key: "Categories", to: "/categories", Icon: Folder, tutorial: "shortcut-categories" },
    { key: "Tasks", to: "/tasks", Icon: ListChecks, tutorial: "shortcut-tasks" },
    { key: "Habits", to: "/habits", Icon: Repeat, tutorial: "shortcut-habits" },
    { key: "Routines", to: "/routines", Icon: CalendarDays, tutorial: "shortcut-routines" },
    { key: "Goals", to: "/goals", Icon: Trophy, tutorial: "shortcut-goals" },
    { key: "Config", to: "/configuration", Icon: Settings, tutorial: "shortcut-configuration" },
];

export default function BottomNav() {
    const { t } = useTranslation();

    return (
        <nav
            data-tutorial-id="dashboard-shortcuts"
            aria-label={t("Shortcuts")}
            className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-border bg-background px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] lg:hidden"
        >
            {ITEMS.map(({ key, to, Icon, tutorial }) => (
                <NavLink
                    key={key}
                    to={to}
                    data-tutorial-id={tutorial}
                    aria-label={t(key)}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-0.5 rounded-card px-3 py-1.5 transition-colors duration-200 ${
                            isActive ? "bg-primary" : "hover:bg-primary/10 active:bg-primary/20"
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {/* Size stays fixed. Growing the active icon would resize two
                                items on every navigation and shift their neighbours — very
                                visible across six items on a 360px viewport. */}
                            <Icon size={20} className={isActive ? "text-background" : "text-icon"} />
                            <span
                                className={`text-[10px] font-semibold ${
                                    isActive ? "text-background" : "text-secondary"
                                }`}
                            >
                                {t(key)}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
