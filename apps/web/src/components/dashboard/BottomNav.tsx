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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openAgentPanel } from "../agent/agentPanelBus";

type NavItem = { key: string; to: string; Icon: LucideIcon; tutorial?: string };

// Barra do mobile (lg:hidden). Cinco alvos: Hoje, Rotinas, [Assistente],
// Habits and More. The assistant takes the middle because it is the ONLY way
// into the agent, and it exists on every authenticated page.
const LEFT: NavItem[] = [
    { key: "NavDashboard", to: "/dashboard", Icon: House },
    { key: "Routines", to: "/routines", Icon: CalendarDays, tutorial: "shortcut-routines" },
];
const RIGHT: NavItem[] = [
    { key: "Habits", to: "/habits", Icon: Repeat, tutorial: "shortcut-habits" },
];

// What left the bar is still one tap away, inside the sheet — with the same label
// as before, which is how the e2e suite finds these destinations.
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
            {/* The scrim sits BELOW the bar: opening "More" must not black out
                os atalhos, que são a orientação de onde se está. */}
            {sheetOpen && (
                <button
                    type="button"
                    aria-label={t("Close")}
                    onClick={() => setSheetOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                />
            )}

            <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
                {sheetOpen && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("More")}
                        className="mx-2 mb-2 rounded-frame border border-border bg-surface p-4 shadow-2xl"
                    >
                        <span
                            aria-hidden="true"
                            className="mx-auto mb-3 block h-1 w-9 rounded-full bg-border"
                        />
                        <h2 className="mb-3 text-[15px] font-semibold text-text">{t("More")}</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {SHEET.map(({ key, to, Icon, tutorial }) => (
                                <Link
                                    key={key}
                                    to={to}
                                    data-tutorial-id={tutorial}
                                    onClick={() => setSheetOpen(false)}
                                    className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface-2/40 px-2 py-4 text-center text-xs font-semibold text-text-2 active:bg-surface-2"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                                        <Icon size={17} aria-hidden="true" />
                                    </span>
                                    {t(key)}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <nav
                    data-tutorial-id="dashboard-shortcuts"
                    aria-label={t("Shortcuts")}
                    className="flex items-end justify-around border-t border-border bg-surface px-2 pb-2 pt-1.5"
                >
                    {LEFT.map(renderLink)}

                    {/* Rises a little above its neighbours and carries a quiet
                        halo: the assistant is the only target that is not
                        navigation. `-translate-y` and not a negative margin — a
                        margin inside a row with `items-end` was reabsorbed by the
                        alignment and the disc never rose. */}
                    <span className="relative flex h-12 w-12 shrink-0 -translate-y-2.5 items-center justify-center">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1.5 rounded-full bg-accent/20 blur-md"
                        />
                        <button
                            type="button"
                            onClick={openAgentPanel}
                            data-tutorial-id="agent-fab"
                            aria-label={t("OpenAssistant")}
                            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/40 transition-transform duration-200 active:scale-95"
                        >
                            <Sparkles size={20} aria-hidden="true" />
                        </button>
                    </span>

                    {RIGHT.map(renderLink)}

                    {/* Anchor for dashboard tutorial step 2. Categories lives
                        behind "More" at this width, so the spotlight follows the
                        PATH to it — and this button is always mounted, while a
                        target inside the closed sheet has no rect to measure.
                        Mirrors the native bar. */}
                    <button
                        type="button"
                        data-tutorial-id="nav-more"
                        onClick={() => setSheetOpen((open) => !open)}
                        aria-expanded={sheetOpen}
                        className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-control py-1.5 transition-colors duration-200 active:bg-surface-2 ${
                            sheetOpen ? "text-accent" : "text-text-3"
                        }`}
                    >
                        <Ellipsis size={20} aria-hidden="true" />
                        <span className="text-[10px] font-semibold">{t("More")}</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
