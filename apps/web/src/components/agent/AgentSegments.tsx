import { useTranslation } from "react-i18next";
import { Check, Loader2, X } from "lucide-react";
import { agentSegment } from "@beyou/types/agent/chatType";
import AgentMarkdown from "./AgentMarkdown";

/** A tool the agent used, shown as a labeled row (spinner → check/×). */
function ToolRow({ segment }: { segment: agentSegment }) {
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
 * Renders an assistant turn as its ordered segments: text runs as markdown,
 * tools as labeled rows, interleaved exactly as they happened. Used for both
 * the live-streaming bubble and persisted history.
 */
function AgentSegments({ segments }: { segments: agentSegment[] }) {
    return (
        <div className="flex flex-col gap-2">
            {segments.map((segment, index) =>
                segment.type === "tool" ? (
                    <ToolRow key={index} segment={segment} />
                ) : (
                    <AgentMarkdown key={index} text={segment.text ?? ""} />
                ),
            )}
        </div>
    );
}

export default AgentSegments;
