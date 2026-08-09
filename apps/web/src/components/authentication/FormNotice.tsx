import { CircleCheck, CircleAlert, Info, Loader } from "lucide-react";

type Tone = "success" | "error" | "info" | "loading";

type FormNoticeProps = {
    tone: Tone;
    title?: string;
    message: string;
    className?: string;
};

const TONES: Record<Tone, { wrapper: string; icon: string }> = {
    success: { wrapper: "border-success/30 bg-success/10", icon: "text-success" },
    error: { wrapper: "border-danger/30 bg-danger/10", icon: "text-danger" },
    info: { wrapper: "border-border bg-surface-2", icon: "text-text-3" },
    loading: { wrapper: "border-border bg-surface-2", icon: "text-text-3 animate-spin" },
};

const ICONS: Record<Tone, typeof Info> = {
    success: CircleCheck,
    error: CircleAlert,
    info: Info,
    loading: Loader,
};

/**
 * An auth form's answer. Every screen used to print a coloured 20px paragraph in the
 * middle of the flow — no hierarchy, no icon and no status role for a screen reader.
 */
export default function FormNotice({ tone, title, message, className = "" }: FormNoticeProps) {
    const Icon = ICONS[tone];
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={`flex items-start gap-2.5 rounded-control border p-3 text-left ${TONES[tone].wrapper} ${className}`}
        >
            <Icon size={15} className={`mt-0.5 shrink-0 ${TONES[tone].icon}`} aria-hidden="true" />
            <div className="min-w-0">
                {title && <p className="text-[13px] font-semibold text-text">{title}</p>}
                <p className={`text-[12.5px] leading-snug text-text-2 ${title ? "mt-0.5" : ""}`}>
                    {message}
                </p>
            </div>
        </div>
    );
}
