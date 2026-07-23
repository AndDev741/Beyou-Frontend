import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Sparkles, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import BeyouIcon from "../../../ui/BeyouIcon";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CategoriesStepProps {
    onContinue: (names: string[]) => void;
    loading: boolean;
}

type Chip = { name: string; iconId?: string };

// Deterministic per-chip drift so the cloud looks organic without re-rolling
// Math.random() on every render (which would jitter on every state change).
const FLOAT_OFFSETS = [-6, -4, -8, -3, -7, -5, -9, -4, -6, -3, -8, -5];

export default function CategoriesStep({ onContinue, loading }: CategoriesStepProps) {
    const { t } = useTranslation();
    const prefersReducedMotion = useReducedMotion();
    const [selected, setSelected] = useState<string[]>([]);
    const [customChips, setCustomChips] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState("");

    const defaultChips: Chip[] = useMemo(
        () => DEFAULT_CATEGORIES.map((c) => ({ name: t(c.nameKey), iconId: c.iconId })),
        [t]
    );

    const chips: Chip[] = useMemo(
        () => [...defaultChips, ...customChips.map((name) => ({ name }))],
        [defaultChips, customChips]
    );

    const isSelected = (name: string) => selected.includes(name);

    const toggle = (name: string) => {
        setSelected((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
        );
    };

    const addCustom = () => {
        const value = customInput.trim();
        if (!value) return;
        const exists = [...chips.map((c) => c.name), ...selected].some(
            (n) => n.toLowerCase() === value.toLowerCase()
        );
        if (!exists) {
            setCustomChips((prev) => [...prev, value]);
            setSelected((prev) => [...prev, value]);
        }
        setCustomInput("");
    };

    const canContinue = selected.length > 0 && !loading;

    return (
        <div className="flex flex-col items-center gap-8 md:gap-10 w-full max-w-4xl mx-auto text-center">
            <div className="space-y-3">
                <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary rounded-full px-3 py-1"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("AiOnboardingStepCategories")}
                </span>
                <h2 className="text-2xl md:text-4xl font-semibold text-secondary leading-tight px-2">
                    {t("AiOnboardingCategoriesQuestion")}
                </h2>
                <p className="text-description text-base md:text-lg max-w-xl mx-auto">
                    {t("AiOnboardingCategoriesHint")}
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 max-w-3xl">
                {chips.map((chip, index) => {
                    const active = isSelected(chip.name);
                    const drift = FLOAT_OFFSETS[index % FLOAT_OFFSETS.length];
                    return (
                        <motion.div
                            key={chip.name}
                            animate={
                                prefersReducedMotion ? undefined : { y: [0, drift, 0] }
                            }
                            transition={
                                prefersReducedMotion
                                    ? undefined
                                    : {
                                          repeat: Infinity,
                                          duration: 3 + (index % 3),
                                          ease: "easeInOut"
                                      }
                            }
                        >
                            <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggle(chip.name)}
                                style={
                                    active
                                        ? undefined
                                        : {
                                              backgroundColor:
                                                  "color-mix(in srgb, var(--secondary) 6%, var(--background))",
                                              borderColor:
                                                  "color-mix(in srgb, var(--primary) 18%, var(--background))"
                                          }
                                }
                                className={cn(
                                    "group flex items-center gap-2 rounded-full px-4 py-2.5 text-sm md:text-base font-medium transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    active
                                        ? "bg-primary text-white border-primary shadow-md scale-105"
                                        : "text-secondary hover:-translate-y-0.5"
                                )}
                            >
                                {chip.iconId && (
                                    <BeyouIcon
                                        id={chip.iconId}
                                        size={16}
                                        className={active ? "text-white" : "text-primary"}
                                    />
                                )}
                                <span>{chip.name}</span>
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            <div className="w-full max-w-md space-y-4">
                <div className="flex items-stretch gap-2">
                    <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addCustom();
                            }
                        }}
                        placeholder={t("AiOnboardingCategoriesPlaceholder")}
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 22%, var(--background))" }}
                        className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-secondary placeholder:text-description focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    <button
                        type="button"
                        onClick={addCustom}
                        aria-label={t("AiOnboardingAdd")}
                        style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-secondary hover:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("AiOnboardingAdd")}</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => onContinue(selected)}
                    disabled={!canContinue}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all",
                        canContinue
                            ? "bg-primary hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                            : "bg-primary opacity-40 cursor-not-allowed"
                    )}
                >
                    {t("AiOnboardingContinue")}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
