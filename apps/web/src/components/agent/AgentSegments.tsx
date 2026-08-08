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
    Trophy,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { agentSegment } from "@beyou/types/agent/chatType";
import AgentMarkdown from "./AgentMarkdown";

type OnInternalLink = (href: string) => void;

/**
 * Ferramentas de LEITURA: viram um chip discreto ("Rotinas consultadas"), que é
 * tudo o que o usuário precisa saber sobre elas. Todo o resto escreve algo, e
 * escrita vira cartão com link para conferir o que o agente fez.
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
]);

/** Destino de cada ferramenta de escrita: rota + ícone + rótulo do link. */
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

// Nomes que citam DUAS entidades (`addTaskToRoutineSection`) casariam a regex
// errada primeiro; o que o usuário quer conferir nesses casos é a rotina.
// `updateGlobalContext` / `updateChatContext` ficam de fora de propósito: a
// memória do agente não tem tela para "ver", então elas viram chip.
const ROUTINE_ITEM_TOOLS = new Set([
    "addTaskToRoutineSection",
    "addHabitToRoutineSection",
    "removeRoutineItem",
]);

export function destinationFor(tool: string | undefined): Destination | null {
    if (!tool) return null;
    if (ROUTINE_ITEM_TOOLS.has(tool)) {
        return { route: "/routines", Icon: CalendarDays, labelKey: "Routines" };
    }
    return DESTINATIONS.find(({ match }) => match.test(tool))?.destination ?? null;
}

/** Ferramenta de leitura, em andamento ou falha: um chip discreto. */
function ToolChip({ segment }: { segment: agentSegment }) {
    const { t } = useTranslation();
    const label = t(`AgentTool.${segment.tool}`, segment.tool ?? "");
    const failed = !!segment.error;
    const running = segment.status === "started";

    return (
        // Chip discreto, como no mockup: o que a ferramenta fez é contexto,
        // não a resposta — não deve competir com o texto do assistente.
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
 * Entidade criada ou alterada: cartão com ícone, o que aconteceu e o link para
 * a seção onde ela vive — o usuário confere o que o agente fez num clique.
 *
 * O rótulo do link é o nome da seção de destino porque a ferramenta só reporta
 * o DOMÍNIO que tocou, não o nome da entidade: prometer "ver a meta X" com um
 * dado que não temos seria inventar.
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
    /** Navega e FECHA o painel — ver `goToPage` no AgentPanel. */
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
