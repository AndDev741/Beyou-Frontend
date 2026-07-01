import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Sparkles, Rocket } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";

type TutorialFinaleProps = {
    onDone: () => void;
};

/**
 * Closing message shown on the dashboard when the tutorial reaches the 'done'
 * phase. If a routine is scheduled for today it points the user at it; otherwise
 * it sends them off to explore. `onDone` completes the tutorial.
 */
export default function TutorialFinale({ onDone }: TutorialFinaleProps) {
    const { t } = useTranslation();
    const hasTodayRoutine = useSelector((state: RootState) => !!state.todayRoutine.routine);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-primary/20 bg-background p-6 text-center text-secondary shadow-lg">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                    {hasTodayRoutine ? (
                        <Sparkles className="h-7 w-7 text-primary" />
                    ) : (
                        <Rocket className="h-7 w-7 text-primary" />
                    )}
                </div>
                <h2 className="text-2xl font-bold">{t("TutorialFinaleTitle")}</h2>
                <p className="mt-2 text-base leading-relaxed text-description">
                    {hasTodayRoutine ? t("TutorialFinaleScheduled") : t("TutorialFinaleExplore")}
                </p>
                <button
                    type="button"
                    onClick={onDone}
                    data-testid="tutorial-finale-done"
                    className="mt-5 rounded-md bg-primary px-6 py-3 text-base font-semibold text-background transition-opacity hover:opacity-90"
                >
                    {t("TutorialGetStarted")}
                </button>
            </div>
        </div>
    );
}
