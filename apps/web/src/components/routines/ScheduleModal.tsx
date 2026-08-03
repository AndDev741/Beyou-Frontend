import { useMemo, useState, useEffect } from "react";
import { Routine } from "@beyou/types/routine/routine";
import { useTranslation } from "react-i18next";
import createSchedule from "@beyou/api/schedule/createSchedule";
import { useDispatch, useSelector } from "react-redux";
import getRoutines from "@beyou/api/routine/getRoutines";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import editSchedule from "@beyou/api/schedule/editSchedule";
import { FiX } from "react-icons/fi";
import { RootState } from "@beyou/state/rootReducer";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import Button from "../Button";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scheduleSchema } from "@beyou/validation/forms/scheduleSchemas";

interface ScheduleModalProps {
    routine: Routine;
    onClose: () => void;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_GROUP = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND_GROUP = ["Saturday", "Sunday"];
// Ordem de exibição: domingo primeiro, igual aos chips do cartão de rotina.
const WEEK_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

    // Dias que outra rotina já ocupa e ainda não foram liberados.
    const blockedDays = WEEK_ORDER.filter((day) => blockedSet.has(day) && !overrides.has(day));

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div
                className="relative z-10 w-full max-w-sm rounded-card border border-border bg-surface p-5 text-text shadow-surface"
                data-tutorial-id="routine-schedule-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-modal-title"
            >
                <div className="flex items-start gap-3">
                    <div className="min-w-0">
                        <h2 id="schedule-modal-title" className="text-base font-semibold tracking-[-0.01em] text-text">
                            {t("ScheduleRoutineTitle")}
                        </h2>
                        <p className="mt-1 text-[13px] text-text-3">
                            {t("ScheduleRoutineSubtitle", { name: routine.name })}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="-mr-1 ml-auto rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                        onClick={onClose}
                        aria-label={t("Close")}
                    >
                        <FiX />
                    </button>
                </div>

                {/* Uma fileira de sete: a semana inteira cabe numa olhada, e o
                    dia já tomado por outra rotina fica marcado no próprio
                    quadrado em vez de num aviso separado. */}
                <div className="mt-3.5 flex gap-1.5">
                    {WEEK_ORDER.map((day) => {
                        const isBlocked = blockedSet.has(day) && !overrides.has(day);
                        const active = selectedDays.includes(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                aria-pressed={active}
                                aria-label={t(day)}
                                title={isBlocked ? `${t("Already scheduled for")}: ${(blockedByDay[day] || []).join(", ")}` : t(day)}
                                onClick={() => toggleDay(day)}
                                className={`h-8 flex-1 rounded-[10px] font-mono text-[11.5px] font-semibold transition-colors duration-200 ${
                                    active
                                        ? "bg-accent text-on-accent"
                                        : isBlocked
                                          ? "cursor-not-allowed bg-danger/10 text-danger"
                                          : "bg-surface-2 text-text-3 hover:text-text-2"
                                }`}
                            >
                                {t(day).charAt(0).toUpperCase()}
                            </button>
                        );
                    })}
                </div>

                {blockedDays.length > 0 && (
                    <div className="mt-3 rounded-control border border-danger/30 bg-danger/5 p-2.5">
                        <p className="text-[12.5px] font-semibold text-danger">{t("Already scheduled for")}</p>
                        {blockedDays.map((day) => (
                            <div key={day} className="mt-1.5 flex items-center gap-2 text-xs text-text-2">
                                <span className="min-w-0 flex-1 truncate">
                                    {t(day)} · {(blockedByDay[day] || []).join(", ")}
                                </span>
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg bg-accent-soft px-2 py-1 text-[11.5px] font-semibold text-accent"
                                    onClick={() => handleOverrideDay(day)}
                                >
                                    {t("Override day")}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
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

                {errors.days?.message && <p className="mt-2 text-xs text-danger">{errors.days.message}</p>}
                <ErrorNotice error={apiError} className="mt-2" />

                <div className="mt-[18px] flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" onClick={onClose} />
                    <Button
                        text={t("Save schedule")}
                        mode="primary"
                        size="medium"
                        disabled={loading}
                        onClick={handleSubmit(handleSchedule)}
                    />
                </div>
            </div>
        </div>
    );
}

function GroupButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors duration-200 ${
                active ? "border-accent bg-accent-soft text-accent" : "border-border text-text-3 hover:text-text-2"
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
