import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { secondBrainSourceEnabled } from "@beyou/state";
import type { SecondBrainSource } from "@beyou/types/secondBrain/secondBrain";
import useAuthGuard from "../../components/useAuthGuard";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import ErrorNotice from "../../components/ErrorNotice";
import OverviewBlock from "../../components/secondBrain/OverviewBlock";
import GoalsBlock from "../../components/secondBrain/GoalsBlock";
import RoutineBlock from "../../components/secondBrain/RoutineBlock";
import AreasBlock from "../../components/secondBrain/AreasBlock";
import QuestionsBlock from "../../components/secondBrain/QuestionsBlock";
import ProfileBlock from "../../components/secondBrain/ProfileBlock";
import SourcesBlock from "../../components/secondBrain/SourcesBlock";
import { useSecondBrain } from "../../components/secondBrain/useSecondBrain";

/**
 * The shape of the page while it loads, so the blocks do not jump when the data lands: a wide
 * reading column and a narrower one beside it.
 */
function Skeleton({ label }: { label: string }) {
    const bar = "animate-pulse rounded-full bg-surface-2";
    const card = "rounded-card border border-border bg-surface p-5 lg:p-6";
    return (
        <div
            role="status"
            aria-label={label}
            aria-busy="true"
            className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]"
            data-testid="second-brain-skeleton"
        >
            <div className="flex flex-col gap-5">
                <div className={card}>
                    <div className={`${bar} h-4 w-40`} />
                    <div className={`${bar} mt-5 h-3.5 w-full`} />
                    <div className={`${bar} mt-2.5 h-3.5 w-[92%]`} />
                    <div className={`${bar} mt-2.5 h-3.5 w-3/5`} />
                </div>
                <div className={card}>
                    <div className={`${bar} h-4 w-48`} />
                    <div className={`${bar} mt-5 h-10 w-full rounded-control`} />
                    <div className={`${bar} mt-3 h-10 w-full rounded-control`} />
                </div>
            </div>
            <div className="flex flex-col gap-5">
                <div className={card}>
                    <div className={`${bar} h-4 w-36`} />
                    <div className={`${bar} mt-5 h-3.5 w-4/5`} />
                    <div className={`${bar} mt-4 h-20 w-full rounded-control`} />
                </div>
                <div className={card}>
                    <div className={`${bar} h-4 w-44`} />
                    <div className={`${bar} mt-5 h-3.5 w-full`} />
                    <div className={`${bar} mt-2.5 h-3.5 w-2/3`} />
                </div>
            </div>
        </div>
    );
}

/**
 * Second Brain: what Beyou understands about a person's life, what it still wants to ask, and
 * what it is allowed to read.
 *
 * Two columns on a wide screen. The left one is for reading (the overview, goals, routines,
 * areas). The right one is for answering and deciding (questions, the profile, the sources).
 * On a phone they interleave so the questions come second instead of fifth: that block is the
 * one that needs the person.
 */
export default function SecondBrain() {
    useAuthGuard();

    const { t } = useTranslation();
    const reducedMotion = useReducedMotion();
    const brain = useSecondBrain();
    const { overview } = brain;

    const enabled = (source: SecondBrainSource) =>
        overview ? secondBrainSourceEnabled(overview.sources, source) : false;

    // Each block rises into place once, in reading order. With reduced motion they are simply there.
    const rise = (order: number) =>
        reducedMotion
            ? {}
            : {
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.35, delay: order * 0.05, ease: [0.16, 1, 0.3, 1] as const },
              };

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7">
            <div className="mx-auto w-full max-w-[1180px]">
                <PageHeader title={t("SecondBrain")} subtitle={t("SecondBrainSubtitle")} />

                {brain.status === "loading" && !overview && <Skeleton label={t("SecondBrainLoading")} />}

                {brain.status === "error" && !overview && (
                    <div
                        className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6"
                        data-testid="second-brain-error"
                    >
                        <p className="text-[15px] font-semibold text-text">{t("SecondBrainLoadFailed")}</p>
                        <ErrorNotice error={brain.loadError} />
                        <Button text={t("TryAgain")} mode="tonal" size="small" onClick={() => void brain.reload()} />
                    </div>
                )}

                {overview && (
                    // Below `lg` the two column wrappers dissolve (`contents`) and every block is
                    // a child of this one flex column, placed by `order`. From `lg` up they are
                    // the two columns and source order takes over again.
                    <div
                        className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] lg:items-start"
                        data-testid="second-brain-page"
                    >
                        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
                            <motion.div className="order-1 lg:order-none" {...rise(0)}>
                                <OverviewBlock
                                    insight={overview.insight}
                                    aiAvailable={overview.aiAvailable}
                                    writing={brain.writing}
                                    error={brain.insightError}
                                    onWrite={() => void brain.writeInsight()}
                                />
                            </motion.div>
                            <motion.div className="order-3 lg:order-none" {...rise(2)}>
                                <GoalsBlock goals={overview.goalsAhead} enabled={enabled("GOALS")} />
                            </motion.div>
                            <motion.div className="order-4 lg:order-none" {...rise(3)}>
                                <RoutineBlock routine={overview.routine} />
                            </motion.div>
                            <motion.div className="order-5 lg:order-none" {...rise(4)}>
                                <AreasBlock areas={overview.areas} enabled={enabled("ROUTINES")} />
                            </motion.div>
                        </div>

                        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
                            <motion.div className="order-2 lg:order-none" {...rise(1)}>
                                <QuestionsBlock
                                    questions={overview.questions}
                                    refilling={brain.refilling}
                                    onAnswer={brain.answer}
                                    onSkip={brain.skip}
                                    onRefill={() => void brain.refill()}
                                />
                            </motion.div>
                            <motion.div className="order-6 lg:order-none" {...rise(5)}>
                                <ProfileBlock
                                    facts={overview.facts}
                                    onCreate={brain.createFact}
                                    onEdit={brain.editFact}
                                    onDelete={brain.deleteFact}
                                />
                            </motion.div>
                            <motion.div className="order-7 lg:order-none" {...rise(6)}>
                                <SourcesBlock
                                    sources={overview.sources}
                                    pending={brain.pendingSource}
                                    onToggle={(source, value) => void brain.toggleSource(source, value)}
                                />
                            </motion.div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
