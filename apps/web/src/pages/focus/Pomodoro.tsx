import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw, Settings2, X } from "lucide-react";
import {
    CYCLE_KINDS,
    CYCLE_LABEL_KEY,
    CYCLE_MESSAGE_KEY,
    MAX_CYCLE_MINUTES,
    MAX_LONG_BREAK_EVERY,
    MIN_CYCLE_MINUTES,
    MIN_LONG_BREAK_EVERY,
    cycleMinutes,
    itemWindowMinutes,
    type CycleKind,
    type FocusItem,
} from "@beyou/state";
import { usePomodoro } from "./usePomodoro";
import MicroTasks from "./MicroTasks";

/**
 * The timer: three cycles, one panel.
 *
 * Painted on `bg-accent` with `text-on-accent`, and the SAME colour for all three cycles. A
 * colour per cycle is the obvious idea and a trap here: there is no `on-success` or `on-xp`
 * token, so a green or amber panel would carry unreadable text in the dark themes, where those
 * tokens are the light ones. `on-accent` exists precisely to stay readable over `accent` in every
 * one of the nine themes. The cycle is carried by the tab and by the line under the clock.
 *
 * Two rules from the epic shape the behaviour:
 *
 * All three lengths are editable and each is the authority for its own cycle. The item's window
 * is OFFERED next to the fields as a one-tap suggestion, never applied silently: reading it as the
 * pomodoro's length is what the first version did, and since `suggestSlots` hands out 15-minute
 * slices, nearly every item built through the routine form has a 15-minute window and the Pomodoro
 * field did nothing at all.
 *
 * There is no failure state. Nothing says a cycle was missed, expired or lost. A finished cycle
 * hands over to the next one and waits to be started, resetting has no consequence, and only
 * finished pomodoros are counted.
 */
export default function Pomodoro({ item, date }: { item: FocusItem; date: string }) {
    const { t } = useTranslation();
    const {
        status,
        formatted,
        selectedCycle,
        settings,
        number,
        runningCycle,
        selectCycle,
        changeSettings,
        start,
        pause,
        resume,
        stop,
    } = usePomodoro(item.groupId, date);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const idle = status === "idle";
    const previewFor = (kind: CycleKind) =>
        `${String(cycleMinutes(kind, settings)).padStart(2, "0")}:00`;

    /**
     * The item's own window, offered rather than imposed.
     *
     * Reading it as the pomodoro's length is what the first version did, and it made the Pomodoro
     * field do nothing: `suggestSlots` hands out 15-minute slices, so nearly every item built
     * through the routine form has a 15-minute window. Offered as a button, the recommendation
     * survives and the typed value still wins.
     */
    const windowMinutes = itemWindowMinutes(item);
    const windowDiffers = windowMinutes !== null && windowMinutes !== settings.pomodoro;

    // While something runs the clock shows THAT cycle. Idle, it previews the selected tab's
    // length, so switching tabs changes the number the way the reference design does.
    const shown = idle ? previewFor(selectedCycle) : formatted;
    const message = t(CYCLE_MESSAGE_KEY[idle ? selectedCycle : runningCycle]);
    const startSelected = () => start(selectedCycle, cycleMinutes(selectedCycle, settings));

    return (
        <div className="flex flex-col gap-2" data-testid="focus-pomodoro">
            <div className="rounded-card bg-accent px-4 py-4 text-on-accent lg:px-6 lg:py-5">
                <div className="flex items-center gap-1">
                    {/* The tabs stay live during a cycle: looking at the Long Break tab while a
                        pomodoro counts down is reasonable, and the clock keeps showing the
                        running cycle regardless. */}
                    <div className="flex flex-1 items-center justify-center gap-1">
                        {CYCLE_KINDS.map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => selectCycle(kind)}
                                aria-pressed={selectedCycle === kind}
                                className={`rounded-control px-3 py-1.5 text-[13px] transition-colors ${
                                    selectedCycle === kind
                                        ? "bg-on-accent/20 font-semibold"
                                        : "font-medium opacity-80 hover:opacity-100"
                                }`}
                                data-testid={`focus-cycle-tab-${kind}`}
                            >
                                {t(CYCLE_LABEL_KEY[kind])}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setSettingsOpen((open) => !open)}
                        aria-label={t("FocusSettings")}
                        title={t("FocusSettings")}
                        aria-expanded={settingsOpen}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control opacity-80 transition-opacity hover:opacity-100"
                        data-testid="focus-pomodoro-settings-toggle"
                    >
                        {settingsOpen ? (
                            <X size={16} aria-hidden="true" />
                        ) : (
                            <Settings2 size={16} aria-hidden="true" />
                        )}
                    </button>
                </div>

                <p
                    className="mt-3 text-center font-mono text-[52px] font-bold leading-none tabular-nums lg:text-[64px]"
                    data-testid="focus-pomodoro-remaining"
                >
                    {shown}
                </p>

                <div className="mt-4 flex items-center justify-center gap-2.5">
                    {status === "running" ? (
                        <PanelButton onClick={pause} testId="focus-pomodoro-pause">
                            <Pause size={16} aria-hidden="true" />
                            {t("FocusPause")}
                        </PanelButton>
                    ) : status === "paused" ? (
                        <PanelButton onClick={resume} testId="focus-pomodoro-resume">
                            <Play size={16} aria-hidden="true" />
                            {t("FocusResume")}
                        </PanelButton>
                    ) : status === "elapsed" ? (
                        <PanelButton onClick={startSelected} testId="focus-pomodoro-next">
                            <Play size={16} aria-hidden="true" />
                            {t("FocusStartNext")}
                        </PanelButton>
                    ) : (
                        <PanelButton onClick={startSelected} testId="focus-pomodoro-start">
                            <Play size={16} aria-hidden="true" />
                            {t("FocusStart")}
                        </PanelButton>
                    )}

                    {/* Only when there is something to reset, and quiet: resetting has no
                        consequence, since nothing is recorded and nothing is lost. */}
                    {!idle && (
                        <button
                            type="button"
                            onClick={stop}
                            aria-label={t("FocusStop")}
                            title={t("FocusStop")}
                            className="flex h-11 w-11 items-center justify-center rounded-control text-on-accent opacity-80 transition-opacity hover:opacity-100"
                            data-testid="focus-pomodoro-stop"
                        >
                            <RotateCcw size={17} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {settingsOpen && (
                    <div
                        className="mt-4 border-t border-on-accent/20 pt-3"
                        data-testid="focus-pomodoro-settings"
                    >
                        <div className="grid grid-cols-3 gap-2.5">
                            {CYCLE_KINDS.map((kind) => (
                                <label key={kind} className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-medium opacity-85">
                                        {t(CYCLE_LABEL_KEY[kind])}
                                    </span>
                                    <input
                                        type="number"
                                        min={MIN_CYCLE_MINUTES}
                                        max={MAX_CYCLE_MINUTES}
                                        value={settings[kind]}
                                        onChange={(event) =>
                                            changeSettings({ [kind]: Number(event.target.value) })
                                        }
                                        className="h-10 w-full rounded-control bg-on-accent/15 px-2.5 text-center font-mono text-[15px] text-on-accent"
                                        data-testid={`focus-setting-${kind}`}
                                    />
                                </label>
                            ))}
                        </div>

                        {windowDiffers && (
                            <button
                                type="button"
                                onClick={() => changeSettings({ pomodoro: windowMinutes })}
                                className="mt-3 rounded-control bg-on-accent/15 px-2.5 py-1.5 text-[12px] font-medium text-on-accent transition-opacity hover:opacity-85"
                                data-testid="focus-use-item-window"
                            >
                                {t("FocusUseItemWindow", { minutes: windowMinutes })}
                            </button>
                        )}

                        <label className="mt-3 flex items-center gap-2 text-[12px] opacity-85">
                            {t("FocusLongBreakEvery")}
                            <input
                                type="number"
                                min={MIN_LONG_BREAK_EVERY}
                                max={MAX_LONG_BREAK_EVERY}
                                value={settings.longBreakEvery}
                                onChange={(event) =>
                                    changeSettings({ longBreakEvery: Number(event.target.value) })
                                }
                                className="h-9 w-16 rounded-control bg-on-accent/15 px-2 text-center font-mono text-[14px] text-on-accent"
                                data-testid="focus-setting-longBreakEvery"
                            />
                            {t("FocusLongBreakEveryUnit")}
                        </label>
                    </div>
                )}
            </div>

            <div className="text-center">
                <p className="font-mono text-[12.5px] text-text-3" data-testid="focus-pomodoro-number">
                    {t("FocusCycleNumber", { number })}
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-2" data-testid="focus-pomodoro-message">
                    {message}
                </p>
            </div>

            {/* The break's micro-tasks, under the message exactly as in the reference design. */}
            <MicroTasks itemGroupId={item.groupId} />
        </div>
    );
}

/** The one light action on the accent panel, so it reads as the thing to do. */
function PanelButton({
    onClick,
    children,
    testId,
}: {
    onClick: () => void;
    children: ReactNode;
    testId: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-control bg-surface text-[15px] font-bold uppercase tracking-[0.04em] text-accent shadow-sm transition-transform active:translate-y-px"
            data-testid={testId}
        >
            {children}
        </button>
    );
}
