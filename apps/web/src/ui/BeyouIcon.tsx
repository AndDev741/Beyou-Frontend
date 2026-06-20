import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { resolveIcon } from "@beyou/icons";

interface BeyouIconProps {
    /** Stored icon id: `lucide:<kebab>`, `emoji:<short_name>`, raw emoji char, or legacy. */
    id?: string | null;
    size?: number;
    className?: string;
    /** Render a neutral lucide fallback for unresolvable ids (default: render nothing). */
    showFallback?: boolean;
}

const FALLBACK_LUCIDE: IconName = "circle";

/**
 * Renders a saved icon id through the shared @beyou/icons resolver:
 * emoji → a <span> with the char, lucide → a code-split <DynamicIcon>.
 * Unresolvable ids (legacy react-icons `ri:*`, empty) render nothing unless
 * `showFallback` is set. Mirrors the React Native BeyouIcon.
 */
export default function BeyouIcon({ id, size, className, showFallback = false }: BeyouIconProps) {
    const descriptor = resolveIcon(id);

    if (descriptor.kind === "emoji") {
        const fontSize = typeof size === "number" ? `${size}px` : undefined;
        return (
            <span
                role="img"
                className={className}
                style={fontSize ? { fontSize, lineHeight: 1 } : { lineHeight: 1 }}
            >
                {descriptor.char}
            </span>
        );
    }

    if (descriptor.kind === "lucide") {
        // `name` is a free-form kebab string from the registry; DynamicIcon
        // types it as the IconName union. The cast is safe — registry names are
        // sourced from lucide's own name list.
        return <DynamicIcon name={descriptor.name as IconName} size={size} className={className} />;
    }

    if (showFallback) {
        return <DynamicIcon name={FALLBACK_LUCIDE} size={size} className={className} />;
    }

    return null;
}
