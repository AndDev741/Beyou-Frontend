import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    House,
    CalendarDays,
    Repeat,
    Sparkles,
    Ellipsis,
    Folder,
    ListChecks,
    Trophy,
    Settings,
    MessageSquare,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openAgentPanel } from "../agent/agentPanelBus";

type NavItem = { key: string; to: string; Icon: LucideIcon; tutorial?: string };

// Barra do mobile (lg:hidden). Cinco alvos: Hoje, Rotinas, [Assistente],
// Hábitos e Mais. O assistente ocupa o centro porque é o ÚNICO acesso ao
// agente e ele existe em toda página autenticada.
const LEFT: NavItem[] = [
    { key: "Today", to: "/dashboard", Icon: House },
    { key: "Routines", to: "/routines", Icon: CalendarDays, tutorial: "shortcut-routines" },
];
const RIGHT: NavItem[] = [
    { key: "Habits", to: "/habits", Icon: Repeat, tutorial: "shortcut-habits" },
];

// Quem saiu da barra continua a um toque, dentro da sheet — com o mesmo rótulo
// de antes, que é como o e2e encontra estes destinos.
const SHEET: NavItem[] = [
    { key: "Tasks", to: "/tasks", Icon: ListChecks, tutorial: "shortcut-tasks" },
    { key: "Goals", to: "/goals", Icon: Trophy, tutorial: "shortcut-goals" },
    { key: "Categories", to: "/categories", Icon: Folder, tutorial: "shortcut-categories" },
    { key: "Config", to: "/configuration", Icon: Settings, tutorial: "shortcut-configuration" },
    { key: "FeedbackShortcutLabel", to: "/feedback", Icon: MessageSquare, tutorial: "shortcut-feedback" },
];

const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-control py-1.5 transition-colors duration-200 ${
        isActive ? "text-accent" : "text-text-3 active:bg-surface-2"
    }`;

export default function BottomNav() {
    const { t } = useTranslation();
    const [sheetOpen, setSheetOpen] = useState(false);

    const renderLink = ({ key, to, Icon, tutorial }: NavItem) => (
        <NavLink key={key} to={to} data-tutorial-id={tutorial} className={itemClass}>
            <Icon size={20} aria-hidden="true" />
            <span className="text-[10px] font-semibold">{t(key)}</span>
        </NavLink>
    );

    return (
        <>
            <nav
                data-tutorial-id="dashboard-shortcuts"
                aria-label={t("Shortcuts")}
                className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-border bg-surface px-2 pb-2 pt-1.5 lg:hidden"
            >
                {LEFT.map(renderLink)}

                <button
                    type="button"
                    onClick={openAgentPanel}
                    data-tutorial-id="agent-fab"
                    aria-label={t("OpenAssistant")}
                    className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-transform duration-200 active:scale-95"
                >
                    <Sparkles size={22} aria-hidden="true" />
                </button>

                {RIGHT.map(renderLink)}

                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-expanded={sheetOpen}
                    className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-control py-1.5 text-text-3 transition-colors duration-200 active:bg-surface-2"
                >
                    <Ellipsis size={20} aria-hidden="true" />
                    <span className="text-[10px] font-semibold">{t("More")}</span>
                </button>
            </nav>

            {sheetOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("More")}
                >
                    <button
                        type="button"
                        aria-label={t("Close")}
                        onClick={() => setSheetOpen(false)}
                        className="absolute inset-0 bg-black/40"
                    />
                    <div className="absolute bottom-0 left-0 right-0 rounded-t-frame border-t border-border bg-surface p-4 pb-8">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-text">{t("More")}</h2>
                            <button
                                type="button"
                                aria-label={t("Close")}
                                onClick={() => setSheetOpen(false)}
                                className="rounded-control p-1.5 text-text-3 active:bg-surface-2"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {SHEET.map(({ key, to, Icon, tutorial }) => (
                                <Link
                                    key={key}
                                    to={to}
                                    data-tutorial-id={tutorial}
                                    onClick={() => setSheetOpen(false)}
                                    className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-2 py-4 text-center text-xs font-semibold text-text-2 active:bg-surface-2"
                                >
                                    <Icon size={20} className="text-text-3" aria-hidden="true" />
                                    {t(key)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
