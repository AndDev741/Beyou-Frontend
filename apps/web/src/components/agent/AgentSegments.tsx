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
        <div
            className={`flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
                failed
                    ? "border-error/30 bg-error/10 text-error"
                    : "border-primary/20 bg-primary/5 text-secondary"
            }`}
        >
            {running ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-primary" />
            ) : failed ? (
                <X size={14} className="shrink-0" />
            ) : (
                <Check size={14} className="shrink-0 text-primary" />
            )}
            <span className="font-medium">
                {label}
                {failed && <span className="font-normal opacity-80"> · {t("AgentToolFailed")}</span>}
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
