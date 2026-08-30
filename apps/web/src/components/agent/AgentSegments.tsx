import { useTranslation } from "react-i18next";
import {
    CalendarDays,
    Check,
    ChevronRight,
    Folder,
    ListChecks,
    Loader2,
    Repeat,
    Settings,
    Target,
    Trophy,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { agentSegment } from "@beyou/types/agent/chatType";
import AgentMarkdown from "./AgentMarkdown";

type OnInternalLink = (href: string) => void;

/**
 * READ tools: they become a quiet chip ("Routines read"), which is all anyone
 * needs to know about them. Everything else writes something, and a write
 * becomes a card with a link to check what the agent did.
 */
const READ_TOOLS = new Set([
    "getUserHabits",
    "getUserCategories",
    "getUserTasks",
    "getUserGoals",
    "getUserRoutines",
    "getTodayRoutine",
    "getUserSchedules",
    "getUserConfiguration",
    // getItemMicroTasks materialises pinned names as it reads, so it is not a pure
    // get. It is a chip anyway: nothing the person asked for changed, and "your
    // micro-tasks, re-pinned" is not a sentence anyone wants in a chat transcript.
    "getItemMicroTasks",
    "getFocusDay",
]);

/** Where each write tool points: route + icon + link label. */
type Destination = { route: string; Icon: LucideIcon; labelKey: string };

const DESTINATIONS: { match: RegExp; destination: Destination }[] = [
    { match: /Habit/, destination: { route: "/habits", Icon: Repeat, labelKey: "Habits" } },
    { match: /Category/, destination: { route: "/categories", Icon: Folder, labelKey: "Categories" } },
    { match: /Task/, destination: { route: "/tasks", Icon: ListChecks, labelKey: "Tasks" } },
    { match: /Goal/, destination: { route: "/goals", Icon: Trophy, labelKey: "Goals" } },
    {
        match: /Routine|Schedule/,
        destination: { route: "/routines", Icon: CalendarDays, labelKey: "Routines" },
    },
    {
        match: /Configuration/,
        destination: { route: "/configuration", Icon: Settings, labelKey: "Config" },
    },
];

// Names that mention TWO entities (`addTaskToRoutineSection`) would match the
// wrong regex first; what you want to check in those cases is the routine.
// `updateGlobalContext` / `updateChatContext` stay out on purpose: the agent's
// memory has no screen to "see", so they become a chip.
const ROUTINE_ITEM_TOOLS = new Set([
    "addTaskToRoutineSection",
    "addHabitToRoutineSection",
    "removeRoutineItem",
]);

// The same trap, worse: every micro-task tool has "Task" in its name and none of
// them has anything to do with the tasks page. `/Task/` matched them all and sent
// people to /tasks to look for something that was never going to be there. Listed
// by name rather than fixed with a cleverer regex, because a name is what the next
// tool will also be added as.
const FOCUS_TOOLS = new Set([
    "addMicroTask",
    "toggleMicroTask",
    "pinMicroTask",
    "deleteMicroTask",
    "reorderMicroTasks",
]);

export function destinationFor(tool: string | undefined): Destination | null {
    if (!tool) return null;
    // A read has nothing to go and look at. The renderer already sends reads down the
    // chip path, so this changes no pixel — it keeps the exported function honest on
    // its own, which matters because `getItemMicroTasks` matches /Task/ and would
    // otherwise answer "/tasks" to anyone who asked it directly.
    if (READ_TOOLS.has(tool)) return null;
    if (ROUTINE_ITEM_TOOLS.has(tool)) {
        return { route: "/routines", Icon: CalendarDays, labelKey: "Routines" };
    }
    if (FOCUS_TOOLS.has(tool)) {
        return { route: "/focus", Icon: Target, labelKey: "FocusTitle" };
    }
    return DESTINATIONS.find(({ match }) => match.test(tool))?.destination ?? null;
}

/** Every tool name this file knows, for the label guard in the test. */
export const KNOWN_TOOLS = [...READ_TOOLS, ...ROUTINE_ITEM_TOOLS, ...FOCUS_TOOLS];

/** A read tool, in flight or failed: a quiet chip. */
function ToolChip({ segment }: { segment: agentSegment }) {
    const { t } = useTranslation();
    const label = t(`AgentTool.${segment.tool}`, segment.tool ?? "");
    const failed = !!segment.error;
    const running = segment.status === "started";

    return (
        // A quiet chip, as in the mockup: what the tool did is context, not the
        // answer — it must not compete with the assistant's text.
        <div
            className={`flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${
                failed
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-border bg-surface text-text-3"
            }`}
        >
            {running ? (
                <Loader2 size={12} className="shrink-0 animate-spin text-accent" />
            ) : failed ? (
                <X size={12} className="shrink-0" />
            ) : (
                <Check size={12} className="shrink-0 text-success" />
            )}
            <span>
                {label}
                {failed && <span className="opacity-80"> · {t("AgentToolFailed")}</span>}
            </span>
        </div>
    );
}

/**
 * An entity created or changed: a card with the icon, what happened, and a link
 * to the section it lives in — one click to check the agent's work.
 *
 * The link label is the destination section's name because the tool only reports
 * the DOMAIN it touched, not the entity's name: promising "see goal X" with data
 * we do not have would be making it up.
 */
function ToolActionCard({
    segment,
    destination,
    onInternalLink,
}: {
    segment: agentSegment;
    destination: Destination;
    onInternalLink?: OnInternalLink;
}) {
    const { t } = useTranslation();
    const { Icon } = destination;
    const label = t(`AgentTool.${segment.tool}`, segment.tool ?? "");
    const target = t(destination.labelKey);

    return (
        <div className="flex max-w-[92%] items-center gap-2.5 rounded-card border border-border bg-bg px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <Icon size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-text">{label}</span>
            {onInternalLink && (
                <button
                    type="button"
                    onClick={() => onInternalLink(destination.route)}
                    className="flex shrink-0 items-center gap-0.5 rounded-control px-1 py-0.5 text-[11px] font-semibold text-accent transition-colors duration-200 hover:bg-surface-2"
                >
                    {target}
                    <ChevronRight size={13} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

function ToolSegment({
    segment,
    onInternalLink,
}: {
    segment: agentSegment;
    onInternalLink?: OnInternalLink;
}) {
    const destination = destinationFor(segment.tool);
    const isWrite =
        !!segment.tool &&
        !READ_TOOLS.has(segment.tool) &&
        segment.status !== "started" &&
        !segment.error &&
        !!destination;

    return isWrite ? (
        <ToolActionCard
            segment={segment}
            destination={destination as Destination}
            onInternalLink={onInternalLink}
        />
    ) : (
        <ToolChip segment={segment} />
    );
}

/**
 * Renders an assistant turn as its ordered segments: text runs as markdown,
 * tools as chips (reads, in-flight, failures) or action cards (writes),
 * interleaved exactly as they happened. Used for both the live-streaming bubble
 * and persisted history.
 */
function AgentSegments({
    segments,
    onInternalLink,
}: {
    segments: agentSegment[];
    /** Navigates and CLOSES the panel — see `goToPage` in AgentPanel. */
    onInternalLink?: OnInternalLink;
}) {
    return (
        <div className="flex flex-col gap-2">
            {segments.map((segment, index) =>
                segment.type === "tool" ? (
                    <ToolSegment key={index} segment={segment} onInternalLink={onInternalLink} />
                ) : (
                    <AgentMarkdown
                        key={index}
                        text={segment.text ?? ""}
                        onInternalLink={onInternalLink}
                    />
                ),
            )}
        </div>
    );
}

export default AgentSegments;
