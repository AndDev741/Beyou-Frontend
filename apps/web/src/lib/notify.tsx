import type { ReactNode } from "react";
import { toast, type CloseButtonProps, type IconProps, type ToastOptions } from "react-toastify";
import { Check, CircleAlert, Info, TriangleAlert, X } from "lucide-react";

/**
 * The mockup's NOTIFY: left border in the tone, the entity's icon, a title and an
 * optional subtitle. Time is a 2px line with no track, at the foot.
 *
 * Every notification goes through the same container in `App`, so the older
 * `toast.*` calls (text only) already inherit the new shell; `notify` exists for
 * when the message has an icon of its own or a second line.
 */

const TILE_BY_TYPE: Record<string, string> = {
    success: "bg-success/12 text-success",
    error: "bg-danger/12 text-danger",
    warning: "bg-flame/15 text-flame",
    info: "bg-accent-soft text-accent",
    default: "bg-accent-soft text-accent",
};

function tileClass(type: string) {
    return `flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
        TILE_BY_TYPE[type] ?? TILE_BY_TYPE.default
    }`;
}

/** Default icon per tone, used when the caller sends no entity icon. */
export function ToastTypeIcon({ type }: IconProps) {
    const glyph =
        type === "success" ? (
            <Check size={16} aria-hidden="true" />
        ) : type === "error" ? (
            <CircleAlert size={16} aria-hidden="true" />
        ) : type === "warning" ? (
            <TriangleAlert size={16} aria-hidden="true" />
        ) : (
            <Info size={16} aria-hidden="true" />
        );

    return <span className={tileClass(type)}>{glyph}</span>;
}

export function ToastCloseButton({ closeToast, ariaLabel }: CloseButtonProps) {
    return (
        <button
            type="button"
            aria-label={ariaLabel || "Close"}
            onClick={closeToast}
            // `ml-auto`, not a fixed margin. The button is a flex child of the toast
            // alongside the body, so a fixed margin parks it wherever the text happens
            // to end — which on a short message left it floating mid-toast with empty
            // space to its right instead of sitting in the corner. Belt and braces with
            // the body's flex-1 below: whichever of the two is doing the work, the X
            // ends up at the edge.
            className="ml-auto mt-0.5 shrink-0 self-start rounded-md p-1 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
        >
            <X size={14} aria-hidden="true" />
        </button>
    );
}

function ToastBody({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
    return (
        // flex-1 so the text owns the width between the icon and the close button, and
        // min-w-0 so a long habit name wraps instead of pushing the button out.
        <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug text-text">{title}</p>
            {subtitle ? (
                <p className="mt-0.5 text-[12px] leading-snug text-text-3">{subtitle}</p>
            ) : null}
        </div>
    );
}

type NotifyOptions = Omit<ToastOptions, "icon"> & {
    subtitle?: ReactNode;
    /** The entity's icon — the habit checked, the goal completed. */
    icon?: ReactNode;
};

function show(
    type: "success" | "error" | "info" | "warning",
    title: ReactNode,
    { subtitle, icon, ...options }: NotifyOptions = {}
) {
    return toast[type](<ToastBody title={title} subtitle={subtitle} />, {
        ...options,
        ...(icon ? { icon: () => <span className={tileClass(type)}>{icon}</span> } : {}),
    });
}

export const notify = {
    success: (title: ReactNode, options?: NotifyOptions) => show("success", title, options),
    error: (title: ReactNode, options?: NotifyOptions) => show("error", title, options),
    info: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
    warning: (title: ReactNode, options?: NotifyOptions) => show("warning", title, options),
};
