import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderOpen,
  Target,
  CheckSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Zap,
  X,
  Check,
  Flag
} from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  exampleTitleKey: string;
  exampleItemKeys: string[];
  tipKey: string;
}

const steps: OnboardingStep[] = [
  {
    id: "categories",
    titleKey: "TutorialCategoriesTitle",
    descriptionKey: "TutorialCategoriesDescription",
    icon: FolderOpen,
    gradient: "linear-gradient(135deg, var(--primary), var(--icon))",
    exampleTitleKey: "TutorialCategoriesExampleTitle",
    exampleItemKeys: [
      "TutorialCategoriesItem1",
      "TutorialCategoriesItem2",
      "TutorialCategoriesItem3",
    ],
    tipKey: "TutorialCategoriesTip",
  },
  {
    id: "habits",
    titleKey: "TutorialHabitsTitle",
    descriptionKey: "TutorialHabitsDescription",
    icon: Target,
    gradient: "linear-gradient(135deg, var(--primary), var(--success))",
    exampleTitleKey: "TutorialHabitsExampleTitle",
    exampleItemKeys: [
      "TutorialHabitsItem1",
      "TutorialHabitsItem2",
      "TutorialHabitsItem3",
    ],
    tipKey: "TutorialHabitsTip",
  },
  {
    id: "tasks",
    titleKey: "TutorialTasksTitle",
    descriptionKey: "TutorialTasksDescription",
    icon: CheckSquare,
    gradient: "linear-gradient(135deg, var(--primary), var(--description))",
    exampleTitleKey: "TutorialTasksExampleTitle",
    exampleItemKeys: [
      "TutorialTasksItem1",
      "TutorialTasksItem2",
      "TutorialTasksItem3",
    ],
    tipKey: "TutorialTasksTip",
  },
  {
    id: "routines",
    titleKey: "TutorialRoutinesTitle",
    descriptionKey: "TutorialRoutinesDescription",
    icon: Calendar,
    gradient: "linear-gradient(135deg, var(--primary), var(--placeholder))",
    exampleTitleKey: "TutorialRoutinesExampleTitle",
    exampleItemKeys: [
      "TutorialRoutinesItem1",
      "TutorialRoutinesItem2",
      "TutorialRoutinesItem3",
    ],
    tipKey: "TutorialRoutinesTip",
  },
  {
    id: "goals",
    titleKey: "TutorialGoalsTitle",
    descriptionKey: "TutorialGoalsDescription",
    icon: Flag,
    gradient: "linear-gradient(135deg, var(--primary), var(--secondary))",
    exampleTitleKey: "TutorialGoalsExampleTitle",
    exampleItemKeys: [
      "TutorialGoalsItem1",
      "TutorialGoalsItem2",
      "TutorialGoalsItem3",
    ],
    tipKey: "TutorialGoalsTip",
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  const variants = {
    enter: (slideDirection: number) => ({
      x: slideDirection > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (slideDirection: number) => ({
      x: slideDirection < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
      <div className="relative w-full max-w-4xl">
        <button
          type="button"
          className="absolute -top-6 right-3 flex items-center gap-1 text-description hover:text-secondary transition-colors"
          onClick={onSkip}
        >
          <span className="text-sm font-semibold">{t("TutorialSkip")}</span>
          <X className="w-4 h-4" />
        </button>

        <div className="bg-background text-secondary rounded-3xl border border-primary/20 shadow-lg overflow-hidden max-h-[92vh] md:max-h-[85vh] md:min-h-[650px] flex flex-col">
          <div className="h-1 bg-description/20">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5 md:p-10 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-center gap-2 md:mb-8">
              {steps.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-200 border border-primary/20",
                    index === currentStep
                      ? "bg-primary scale-125"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-description/40 hover:bg-description/70"
                  )}
                  aria-label={t(s.titleKey)}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto md:overflow-hidden pr-1">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                    <div className="space-y-6">
                      <div className="flex md:flex-col items-start gap-6">
                        <div
                          className="p-2 md:w-16 md:h-16 flex items-center justify-center rounded-full"
                          style={{ background: step.gradient }}
                        >
                          <step.icon className="w-8 h-8 text-white" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-primary mb-2">
                            {t("TutorialStepOf", {
                              current: currentStep + 1,
                              total: steps.length,
                            })}
                          </p>
                          <h2 className="text-2xl md:text-3xl font-semibold text-secondary">
                            {t(step.titleKey)}
                          </h2>
                          
                        </div>
                      </div>

                      <p className="text-description text-lg leading-relaxed">
                        {t(step.descriptionKey)}
                      </p>
                      
                      <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-secondary mb-1">
                              {t("TutorialProTip")}
                            </p>
                            <p className="text-sm text-description">
                              {t(step.tipKey)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-sm">
                        <div
                          className="rounded-2xl p-6 text-white shadow-lg"
                          style={{ background: step.gradient }}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <step.icon className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-lg">
                              {t(step.exampleTitleKey)}
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {step.exampleItemKeys.map((itemKey, index) => (
                              <motion.div
                                key={itemKey}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                              >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </div>
                                <span className="text-sm font-medium">
                                  {t(itemKey)}
                                </span>
                              </motion.div>
                            ))}
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                            <span className="text-sm opacity-80">
                              {t("TutorialCompleteForXp")}
                            </span>
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              <span className="font-bold">
                                +{(currentStep + 1) * 50} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isLast && (
                          <div className="flex justify-center mt-6">
                            <div className="flex items-center gap-2 text-description">
                              <ArrowRight className="w-4 h-4 animate-pulse" />
                              <span className="text-sm">
                                {t("TutorialLinksTo", {
                                  next: t(steps[currentStep + 1].titleKey),
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-primary/20">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors",
                  isFirst
                    ? "text-description cursor-not-allowed"
                    : "text-secondary hover:text-primary"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                {t("TutorialPrevious")}
              </button>

              <button
                type="button"
                onClick={goNext}
                className={cn(
                  "flex items-center gap-2 min-w-[150px] justify-center rounded-lg px-5 py-2 font-semibold text-background transition-all",
                  isLast
                    ? "bg-success hover:opacity-90"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isLast ? (
                  <>
                    {t("TutorialGetStarted")}
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {t("TutorialNext")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="absolute -z-10 -top-16 -left-16 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -z-10 -bottom-16 -right-16 w-40 h-40 bg-success/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
