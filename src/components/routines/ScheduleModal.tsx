import { useMemo, useState, useEffect } from "react";
import { Routine } from "../../types/routine/routine";
import { useTranslation } from "react-i18next";
import createSchedule from "../../services/schedule/createSchedule";
import { useDispatch, useSelector } from "react-redux";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import editSchedule from "../../services/schedule/editSchedule";
import { FiX, FiCalendar, FiCheck } from "react-icons/fi";
import { RootState } from "../../redux/rootReducer";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scheduleSchema } from "../../validation/forms/scheduleSchemas";

interface ScheduleModalProps {
    routine: Routine;
    onClose: () => void;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_GROUP = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND_GROUP = ["Saturday", "Sunday"];

type ScheduleFormValues = {
    days: string[];
};

export default function ScheduleModal({ routine, onClose }: ScheduleModalProps) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const allRoutines = (useSelector((state: RootState) => state.routines.routines) as Routine[]) || [];
    const [loading, setLoading] = useState(false);
    const [overrides, setOverrides] = useState<Set<string>>(new Set());
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

    const {
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<ScheduleFormValues>({
        resolver: zodResolver(scheduleSchema),
        mode: "onBlur",
        defaultValues: {
            days: routine?.schedule?.days || []
        }
    });

    useEffect(() => {
        reset({ days: routine?.schedule?.days || [] });
    }, [routine, reset]);

    const selectedDays = watch("days") || [];

    const blockedByDay = useMemo(() => {
        const map: Record<string, string[]> = {};
        allRoutines
            .filter((r) => r.id !== routine.id)
            .forEach((r) => {
                r.schedule?.days?.forEach((day) => {
                    if (!map[day]) map[day] = [];
                    map[day].push(r.name);
                });
            });
        return map;
    }, [allRoutines, routine.id]);

    const blockedSet = useMemo(() => new Set(Object.keys(blockedByDay)), [blockedByDay]);

    const toggleDay = (day: string) => {
        const blocked = blockedSet.has(day) && !overrides.has(day);
        if (blocked) {
            return;
        }
        const next = selectedDays.includes(day)
            ? selectedDays.filter((d) => d !== day)
            : [...selectedDays, day];
        setValue("days", next, { shouldValidate: true });
    };

    const toggleGroup = (days: string[]) => {
        const allPresent = days.every((d) => selectedDays.includes(d));
        if (allPresent) {
            setValue(
                "days",
                selectedDays.filter((d) => !days.includes(d)),
                { shouldValidate: true }
            );
            return;
        }
        const filtered = selectedDays.filter((d) => !days.includes(d));
        const allowed = days.filter((d) => !blockedSet.has(d) || overrides.has(d));
        setValue("days", [...filtered, ...allowed], { shouldValidate: true });
    };

    const handleOverrideDay = (day: string) => {
        setOverrides((prev) => {
            const next = new Set(prev);
            next.add(day);
            return next;
        });
        if (!selectedDays.includes(day)) {
            setValue("days", [...selectedDays, day], { shouldValidate: true });
        }
    };

    const handleSchedule = async (values: ScheduleFormValues) => {
        if (loading) return;
        setLoading(true);
        setApiError(null);
        const scheduleId = routine.schedule?.id || "";
        const response = !scheduleId
            ? await createSchedule(values.days, routine.id!, t)
            : await editSchedule(scheduleId, values.days, routine.id!, t);

        const error = response?.error || response?.validation;
        if (error) {
            if (typeof error === "string") {
                toast.error(error);
                setApiError({ message: error });
            } else {
                setApiError(error);
                toast.error(getFriendlyErrorMessage(t, error));
            }
            setLoading(false);
            return;
        }
        const routines = await getRoutines(t);
        dispatch(enterRoutines(routines.success));
        setLoading(false);
        toast.success(t(!scheduleId ? "created successfully" : "edited successfully"));
        onClose();
    };

    const resetSelection = () => setValue("days", routine?.schedule?.days || [], { shouldValidate: true });

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
                                const isBlocked = blockedSet.has(day) && !overrides.has(day);
                                const active = selectedDays.includes(day);
                                const names = blockedByDay[day] || [];

                                return (
                                    <div key={day} className="relative group">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg border p-2 text-sm font-medium transition
                                                ${
                                                    active
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                        : isBlocked
                                                            ? "border-error/30 bg-error/5 text-error cursor-not-allowed"
                                                            : "border-primary/20 bg-background text-secondary hover:border-primary/50"
                                                }
                                        `}
                                            onClick={() => toggleDay(day)}
                                            aria-disabled={isBlocked && !selectedDays.includes(day)}
                                        >
                                            <span>{t(day)}</span>
                                            {active && <FiCheck className="h-4 w-4" />}
                                        </button>

                                        {isBlocked && (
                                            <div
                                                className="
                                                        pointer-events-auto
                                                        absolute left-1/2 top-full z-20 w-56
                                                        -translate-x-1/2 translate-y-0
                                                        rounded-md border border-error/30 bg-background
                                                        p-3 text-xs shadow-lg

                                                        invisible opacity-0
                                                        group-hover:visible group-hover:opacity-100
                                                        group-focus-within:visible group-focus-within:opacity-100
                                                        hover:visible hover:opacity-100

                                                        transition-opacity duration-150
                                                        "
                                            >
                                                <p className="font-semibold text-error">{t("Already scheduled for")}</p>

                                                <p className="mt-1 text-description">{names.join(", ")}</p>

                                                <button
                                                    type="button"
                                                    className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-background transition hover:bg-primary/90"
                                                    onClick={() => handleOverrideDay(day)}
                                                >
                                                    {t("Override day")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
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

                        <div className="rounded-xl border border-primary/20 bg-background/80 p-4">
                            <p className="text-sm font-semibold text-secondary mb-2">{t("Summary")}</p>
                            <div className="text-xs text-description">
                                {selectedDays.length > 0
                                    ? selectedDays.map((day) => t(day)).join(", ")
                                    : t("No days selected")}
                            </div>
                            <button
                                type="button"
                                className="mt-3 flex items-center gap-2 text-xs text-description hover:text-primary"
                                onClick={resetSelection}
                            >
                                {t("Reset")}
                            </button>
                        </div>
                    </div>
                </div>

                {errors.days?.message && (
                    <p className="text-error text-sm mt-2">{errors.days?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center mt-2" />

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-primary/10"
                        onClick={onClose}
                    >
                        {t("Cancel")}
                    </button>
                    <button
                        type="button"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:opacity-60"
                        onClick={handleSubmit(handleSchedule)}
                        disabled={loading}
                    >
                        {t("Save")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function GroupButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold transition
                ${active ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-secondary hover:border-primary/50"}
            `}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
