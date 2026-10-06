import type { ReactNode } from "react";
import { resolveIcon } from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";

/**
 * A topic's or page's own icon when it has one, otherwise the default the screen passes (the
 * layers for a topic, a document for a page). Every place the notebook draws a page goes
 * through here, so an icon picked on the page shows in the tree, on the board and on the home.
 */
export default function NotebookIcon({ icon, size, fallback, className }: {
    icon: string | null | undefined;
    size: number;
    fallback: ReactNode;
    className?: string;
}) {
    if (!icon || resolveIcon(icon).kind === "fallback") return <>{fallback}</>;
    return <BeyouIcon id={icon} size={size} className={className} />;
}
