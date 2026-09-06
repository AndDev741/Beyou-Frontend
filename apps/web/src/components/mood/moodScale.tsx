import { Angry, Frown, Meh, Smile, Laugh, type LucideIcon } from "lucide-react";
import type { MoodLevel } from "@beyou/types/mood/mood";

/**
 * The five faces, and the colour each one wears.
 *
 * Existing semantic tokens rather than a new palette: danger, flame, a muted neutral, accent and
 * success already exist in all nine themes and already mean roughly what these levels mean. A
 * `--mood-3-rgb` family would have been five more variables to define nine times, and would drift
 * the first time somebody added a theme.
 */
export const MOOD_FACES: Record<MoodLevel, { Icon: LucideIcon; fill: string; text: string }> = {
    1: { Icon: Angry, fill: "bg-danger", text: "text-danger" },
    2: { Icon: Frown, fill: "bg-flame", text: "text-flame" },
    3: { Icon: Meh, fill: "bg-text-3", text: "text-text-3" },
    4: { Icon: Smile, fill: "bg-accent", text: "text-accent" },
    5: { Icon: Laugh, fill: "bg-success", text: "text-success" },
};
