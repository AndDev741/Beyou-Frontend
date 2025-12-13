import { useState } from "react";
import { Routine } from "../../types/routine/routine";
import { useTranslation } from "react-i18next";
import createSchedule from "../../services/schedule/createSchedule";
import { useDispatch } from "react-redux";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import editSchedule from "../../services/schedule/editSchedule";
import { FiX, FiCalendar, FiCheck, FiRotateCcw } from "react-icons/fi";

interface ScheduleModalProps {
    routine: Routine;
    onClose: () => void;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_GROUP = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND_GROUP = ["Saturday", "Sunday"];

export default function ScheduleModal({ routine, onClose }: ScheduleModalProps) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [selectedDays, setSelectedDays] = useState<string[]>(routine?.schedule?.days || []);
    const [loading, setLoading] = useState(false);

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const toggleGroup = (days: string[]) => {
        const allPresent = days.every((d) => selectedDays.includes(d));
        setSelectedDays((prev) => {
            if (allPresent) return prev.filter((d) => !days.includes(d));
            const filtered = prev.filter((d) => !days.includes(d));
            return [...filtered, ...days];
        });
    };

    const handleSchedule = async () => {
        if (loading) return;
        setLoading(true);
        const scheduleId = routine.schedule?.id || "";
        if (!scheduleId) {
            await createSchedule(selectedDays, routine.id!, t);
        } else {
            await editSchedule(scheduleId, selectedDays, routine.id!, t);
        }
        const routines = await getRoutines(t);
        dispatch(enterRoutines(routines.success));
        setLoading(false);
        onClose();
    };

    const resetSelection = () => setSelectedDays(routine?.schedule?.days || []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-xl rounded-2xl border border-primary/25 bg-background p-6 shadow-2xl">
                <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <FiCalendar />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-description">{t("Schedule")}</p>
                            <h2 className="text-xl font-semibold text-secondary">{routine.name}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="rounded-full p-2 text-description transition hover:bg-primary/10 hover:text-primary"
                        onClick={onClose}
                        aria-label={t("Close")}
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </header>

                <div className="mt-6 grid gap-4 md:grid-cols-[2fr,1fr]">
                    <div className="rounded-xl border border-primary/20 bg-background/80 p-4">
                        <p className="text-sm font-semibold text-secondary mb-3">{t("Pick your days")}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 gap-3">
                            {ALL_DAYS.map((day) => {
                                const active = selectedDays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        className={`flex items-center justify-between rounded-lg border px-2 py-2 text-sm font-medium transition ${active
                                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                                            : "border-primary/20 bg-background text-secondary hover:border-primary/50"
                                            }`}
                                        onClick={() => toggleDay(day)}
                                    >
                                        <span>{t(day)}</span>
                                        {active ? <FiCheck className="h-4 w-4" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-primary/20 bg-background/80 p-4 space-y-3">
                            <p className="text-sm font-semibold text-secondary">{t("Quick select")}</p>
                            <GroupButton
                                label={t("Mon - Fri")}
                                active={WEEKDAY_GROUP.every((d) => selectedDays.includes(d))}
                                onClick={() => toggleGroup(WEEKDAY_GROUP)}
                            />
                            <GroupButton
                                label={t("Weekend")}
                                active={WEEKEND_GROUP.every((d) => selectedDays.includes(d))}
                                onClick={() => toggleGroup(WEEKEND_GROUP)}
                            />
                            <GroupButton
                                label={t("All week")}
                                active={ALL_DAYS.every((d) => selectedDays.includes(d))}
                                onClick={() => toggleGroup(ALL_DAYS)}
                            />
                        </div>

                        <button
                            type="button"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                            onClick={resetSelection}
                        >
                            <FiRotateCcw className="h-4 w-4" />
                            {t("Reset to current")}
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        className="w-full sm:w-auto rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-primary/10"
                        onClick={onClose}
                    >
                        {t("Cancel")}
                    </button>
                    <button
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={handleSchedule}
                        disabled={loading}
                    >
                        <FiCheck className="h-4 w-4" />
                        {loading ? t("Saving...") : t("Save schedule")}
                    </button>
                </div>
            </div>
        </div>
    );
}

type GroupButtonProps = {
    label: string;
    active: boolean;
    onClick: () => void;
};

const GroupButton = ({ label, active, onClick }: GroupButtonProps) => (
    <button
        type="button"
        className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${active
            ? "border-primary bg-primary/10 text-primary shadow-sm"
            : "border-primary/20 text-secondary hover:border-primary/50"
            }`}
        onClick={onClick}
    >
        {label}
    </button>
);
