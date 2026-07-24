import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import BeyouIcon from "../../../ui/BeyouIcon";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SuggestionCardProps {
    name: string;
    description: string;
    iconId: string;
    selected: boolean;
    onToggle: () => void;
    /** Right-aligned slot for extra info (importance/difficulty dots, goal target...). */
    meta?: ReactNode;
}

/** Selectable suggestion card shared by the habits/tasks/goals wizard steps. */
export default function SuggestionCard({
    name,
    description,
    iconId,
    selected,
    onToggle,
    meta
}: SuggestionCardProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            style={
                selected
                    ? {
                          backgroundColor:
                              "color-mix(in srgb, var(--primary) 10%, var(--background))"
                      }
                    : {
                          backgroundColor:
                              "color-mix(in srgb, var(--secondary) 5%, var(--background))",
                          borderColor:
                              "color-mix(in srgb, var(--primary) 16%, var(--background))"
                      }
            }
            className={cn(
                "relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                    ? "border-[var(--primary)] shadow-md"
                    : "hover:-translate-y-0.5 hover:shadow-md"
            )}
        >
            {/* Check badge */}
            <span
                aria-hidden="true"
                className={cn(
                    "absolute -top-1.5 -right-1.5 flex w-5 h-5 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all duration-200",
                    selected ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )}
            >
                <Check className="w-3 h-3" strokeWidth={3} />
            </span>

            <span
                className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                    backgroundColor: selected
                        ? "color-mix(in srgb, var(--primary) 18%, var(--background))"
                        : "color-mix(in srgb, var(--primary) 10%, var(--background))"
                }}
            >
                <BeyouIcon id={iconId} size={20} className="text-primary" />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-secondary leading-snug">{name}</span>
                <span className="text-sm text-description leading-snug line-clamp-2">
                    {description}
                </span>
            </span>

            {meta && <span className="shrink-0 self-start pt-0.5">{meta}</span>}
        </motion.button>
    );
}
