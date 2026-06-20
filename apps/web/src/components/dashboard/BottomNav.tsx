import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Folder, ListChecks, Repeat, CalendarDays, Trophy, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { key: string; to: string; Icon: LucideIcon; tutorial: string; emphasis?: boolean };

// Mobile-only (lg:hidden) fixed action bar — mirrors the native app's BottomNav.
// Order: Categories · Tasks · Habits · Routines · Goals · Config, with Habits +
// Routines emphasized. Desktop keeps the <Shortcuts/> sidebar.
const ITEMS: NavItem[] = [
    { key: "Categories", to: "/categories", Icon: Folder, tutorial: "shortcut-categories" },
    { key: "Tasks", to: "/tasks", Icon: ListChecks, tutorial: "shortcut-tasks" },
    { key: "Habits", to: "/habits", Icon: Repeat, tutorial: "shortcut-habits", emphasis: true },
    { key: "Routines", to: "/routines", Icon: CalendarDays, tutorial: "shortcut-routines", emphasis: true },
    { key: "Goals", to: "/goals", Icon: Trophy, tutorial: "shortcut-goals" },
    { key: "Config", to: "/configuration", Icon: Settings, tutorial: "shortcut-configuration" },
];

export default function BottomNav() {
    const { t } = useTranslation();

    return (
        <nav
            data-tutorial-id="dashboard-shortcuts"
            aria-label={t("Shortcuts")}
            className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-primary/20 bg-background px-1 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] lg:hidden"
        >
            {ITEMS.map(({ key, to, Icon, tutorial, emphasis }) => (
                <Link
                    key={key}
                    to={to}
                    data-tutorial-id={tutorial}
                    aria-label={t(key)}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors duration-200 ${
                        emphasis ? "bg-primary" : "hover:bg-primary/10 active:bg-primary/20"
                    }`}
                >
                    <Icon size={emphasis ? 22 : 20} className={emphasis ? "text-background" : "text-icon"} />
                    <span className={`text-[10px] font-semibold ${emphasis ? "text-background" : "text-secondary"}`}>
                        {t(key)}
                    </span>
                </Link>
            ))}
        </nav>
    );
}
