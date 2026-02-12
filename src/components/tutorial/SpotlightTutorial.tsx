import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type SpotlightPosition = "top" | "bottom" | "left" | "right" | "auto";

export interface SpotlightStep {
    id: string;
    targetSelector: string;
    titleKey: string;
    descriptionKey: string;
    position?: SpotlightPosition;
    action?: "click" | "observe";
    disableNext?: boolean;
    forceNextLabel?: boolean;
}

interface SpotlightTutorialProps {
    steps: SpotlightStep[];
    onComplete: () => void;
    onSkip: () => void;
    isActive: boolean;
    currentStep?: number;
    onStepChange?: (step: number) => void;
}

type TooltipPosition = {
    top: number;
    left: number;
    arrow?: "top" | "bottom" | "left" | "right";
};

const TOOLTIP_FALLBACK = { width: 320, height: 200 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const pickAutoPosition = (rect: DOMRect) => {
    const spaces = {
        top: rect.top,
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right
    };
    const entries = Object.entries(spaces) as Array<[SpotlightPosition, number]>;
    return entries.sort((a, b) => b[1] - a[1])[0][0] as SpotlightPosition;
};

export default function SpotlightTutorial({
    steps,
    onComplete,
    onSkip,
    isActive,
    currentStep,
    onStepChange
}: SpotlightTutorialProps) {
    const { t } = useTranslation();
    const [internalStep, setInternalStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltipSize, setTooltipSize] = useState(TOOLTIP_FALLBACK);

    const stepIndex = currentStep ?? internalStep;
    const setStep = onStepChange ?? setInternalStep;
    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;
    const showFinishLabel = isLast && !step?.forceNextLabel;

    useEffect(() => {
        if (!isActive) {
            setIsVisible(false);
            return;
        }
        if (currentStep === undefined) {
            setInternalStep(0);
        }
    }, [isActive, currentStep]);

    useLayoutEffect(() => {
        if (!isVisible || !tooltipRef.current) return;
        const rect = tooltipRef.current.getBoundingClientRect();
        setTooltipSize({ width: rect.width, height: rect.height });
    }, [isVisible, step?.id]);

    useEffect(() => {
        if (!isActive || !step) return;

        let frame = 0;
        let timeout: ReturnType<typeof setTimeout> | null = null;

        const findTarget = () => {
            const targets = Array.from(document.querySelectorAll(step.targetSelector)) as HTMLElement[];
            if (targets.length === 0) {
                setIsVisible(false);
                return;
            }
            const target = targets.find((item) => {
                const rect = item.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }) ?? targets[0];

            const rect = target.getBoundingClientRect();
            setTargetRect(rect);
            setIsVisible(true);

            const isOutside =
                rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth;
            if (isOutside) {
                target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            }
        };

        timeout = setTimeout(() => {
            frame = window.requestAnimationFrame(findTarget);
        }, 120);

        window.addEventListener("scroll", findTarget, true);
        window.addEventListener("resize", findTarget);

        return () => {
            if (timeout) clearTimeout(timeout);
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener("scroll", findTarget, true);
            window.removeEventListener("resize", findTarget);
        };
    }, [isActive, step?.id, step?.targetSelector]);

    useEffect(() => {
        if (!isActive || !step || step.action !== "click") return;
        const targets = Array.from(document.querySelectorAll(step.targetSelector)) as HTMLElement[];
        const target = targets.find((item) => {
            const rect = item.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }) ?? targets[0];
        if (!target) return;

        const handleClick = () => {
            goNext();
        };

        target.addEventListener("click", handleClick);
        return () => {
            target.removeEventListener("click", handleClick);
        };
    }, [isActive, step?.id, step?.targetSelector, step?.action]);

    const goNext = () => {
        if (step?.disableNext) return;
        if (isLast) {
            onComplete();
        } else {
            setIsVisible(false);
            setTimeout(() => {
                setStep(stepIndex + 1);
            }, 200);
        }
    };

    if (!isActive || !step) return null;

    const tooltipPosition: TooltipPosition | null = useMemo(() => {
        if (!targetRect) return null;
        const padding = 12;
        const width = tooltipSize.width ?? TOOLTIP_FALLBACK.width;
        const height = tooltipSize.height ?? TOOLTIP_FALLBACK.height;
        const preferred = step.position && step.position !== "auto" ? step.position : pickAutoPosition(targetRect);
        const position =
            window.innerWidth < 768 && (preferred === "left" || preferred === "right")
                ? "bottom"
                : preferred;
        let top = 0;
        let left = 0;
        let arrow: TooltipPosition["arrow"] = "top";

        switch (position) {
            case "top":
                top = targetRect.top - height - padding;
                left = targetRect.left + targetRect.width / 2 - width / 2;
                arrow = "bottom";
                break;
            case "bottom":
                top = targetRect.bottom + padding;
                left = targetRect.left + targetRect.width / 2 - width / 2;
                arrow = "top";
                break;
            case "left":
                top = targetRect.top + targetRect.height / 2 - height / 2;
                left = targetRect.left - width - padding;
                arrow = "right";
                break;
            case "right":
                top = targetRect.top + targetRect.height / 2 - height / 2;
                left = targetRect.right + padding;
                arrow = "left";
                break;
            default:
                top = targetRect.bottom + padding;
                left = targetRect.left + targetRect.width / 2 - width / 2;
                arrow = "top";
        }

        const maxTop = window.innerHeight - height - padding;
        const maxLeft = window.innerWidth - width - padding;
        return {
            top: clamp(top, padding, maxTop),
            left: clamp(left, padding, maxLeft),
            arrow
        };
    }, [targetRect, step.position, tooltipSize.height, tooltipSize.width]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0"
                    >
                        {targetRect && (
                            <>
                                <div
                                    className="absolute bg-black/60 backdrop-blur-sm"
                                    style={{
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: Math.max(0, targetRect.top)
                                    }}
                                />
                                <div
                                    className="absolute bg-black/60 backdrop-blur-sm"
                                    style={{
                                        top: targetRect.top,
                                        left: 0,
                                        width: Math.max(0, targetRect.left),
                                        height: targetRect.height
                                    }}
                                />
                                <div
                                    className="absolute bg-black/60 backdrop-blur-sm"
                                    style={{
                                        top: targetRect.top,
                                        left: targetRect.right,
                                        width: Math.max(0, window.innerWidth - targetRect.right),
                                        height: targetRect.height
                                    }}
                                />
                                <div
                                    className="absolute bg-black/60 backdrop-blur-sm"
                                    style={{
                                        top: targetRect.bottom,
                                        left: 0,
                                        width: "100%",
                                        height: Math.max(0, window.innerHeight - targetRect.bottom)
                                    }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute rounded-xl ring-2 ring-primary shadow-[0_0_25px_rgba(0,130,225,0.45)]"
                                    style={{
                                        top: targetRect.top - 8,
                                        left: targetRect.left - 8,
                                        width: targetRect.width + 16,
                                        height: targetRect.height + 16
                                    }}
                                />
                            </>
                        )}
                    </motion.div>

                    {tooltipPosition && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            ref={tooltipRef}
                            className="absolute z-10 w-80 pointer-events-auto"
                            style={{
                                top: tooltipPosition.top,
                                left: tooltipPosition.left
                            }}
                        >
                            <div className="bg-background border border-primary/20 rounded-2xl shadow-2xl overflow-hidden text-secondary">
                                <div className="bg-primary/10 px-5 py-3 border-b border-primary/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-semibold text-primary">
                                            {t("TutorialStepOf", { current: stepIndex + 1, total: steps.length })}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onSkip}
                                        className="text-description hover:text-secondary transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-semibold text-secondary mb-2">
                                        {t(step.titleKey)}
                                    </h3>
                                    <p className="text-sm text-description leading-relaxed mb-4">
                                        {t(step.descriptionKey)}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={onSkip}
                                            className="text-sm text-description hover:text-secondary transition-colors"
                                        >
                                            {t("TutorialSkip")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goNext}
                                            disabled={step.disableNext}
                                            className={cn(
                                                "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold transition-all",
                                                step.disableNext
                                                    ? "bg-description/30 text-description cursor-not-allowed"
                                                    : "bg-primary text-background hover:bg-primary/90"
                                            )}
                                        >
                                            {showFinishLabel ? t("TutorialFinish") : t("TutorialNext")}
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-5 pb-4 flex items-center justify-center gap-1.5">
                                    {steps.map((_, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all border border-primary/20",
                                                index === stepIndex
                                                    ? "bg-primary w-4"
                                                    : index < stepIndex
                                                    ? "bg-primary/50"
                                                    : "bg-description/40"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {tooltipPosition.arrow === "top" && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border-l border-t border-primary/20 rotate-45" />
                            )}
                            {tooltipPosition.arrow === "bottom" && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border-r border-b border-primary/20 rotate-45" />
                            )}
                            {tooltipPosition.arrow === "left" && (
                                <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-background border-l border-b border-primary/20 rotate-45" />
                            )}
                            {tooltipPosition.arrow === "right" && (
                                <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-background border-r border-t border-primary/20 rotate-45" />
                            )}
                        </motion.div>
                    )}
                </div>
            )}
        </AnimatePresence>
    );
}
