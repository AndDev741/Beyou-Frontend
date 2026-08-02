import { useTranslation } from "react-i18next";
import { RoutineSection as section } from "@beyou/types/routine/routineSection";
import BeyouIcon from "../../../ui/BeyouIcon";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import checkRoutine from "@beyou/api/routine/checkItem";
import skipRoutine from "@beyou/api/routine/skipItem";
import { useEffect, useRef, useState } from "react";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import useUiRefresh from "../../../hooks/useUiRefresh";
import { formatTimeRange } from "../../routines/routineMetrics";
import { FiSlash } from "react-icons/fi";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import XpFloat from "./XpFloat";
import Ring from "../../../ui/Ring";

const XP_FLOAT_DURATION_MS = 1200;

export default function RoutineSection({ section, routineId}: { section: section, routineId: string }) {
    const { t } = useTranslation();

    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    const [xpFloats, setXpFloats] = useState<Record<string, number>>({});
    const xpFloatTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => {
        const timers = xpFloatTimers.current;
        return () => { timers.forEach(clearTimeout); };
    }, []);

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    useUiRefresh(refreshUi);

    const getMergedItems = () => {
        const tasks = section.taskGroup?.map(item => ({
            type: 'task' as const,
            id: item.taskId,
            groupId: item.id,
            startTime: item?.startTime,
            endTime: item?.endTime,
            check: item?.taskGroupChecks
        })) || [];

        const habits = section.habitGroup?.map(item => ({
            type: 'habit' as const,
            id: item.habitId,
            groupId: item.id,
            startTime: item?.startTime,
            endTime: item?.endTime,
            check: item?.habitGroupChecks
        })) || [];

        return [...tasks, ...habits].sort((a, b) =>
            a?.startTime ? a.startTime.localeCompare(b.startTime) : 0 - (b?.startTime ? b.startTime.localeCompare(a.startTime) : 0)
        );
    };

     const handleCheck = async (groupToCheck: itemGroupToCheck) => {
        const refreshUiReponse = await checkRoutine(groupToCheck, t);
        if(refreshUiReponse?.success){
            setRefreshUi(refreshUiReponse.success);
            const itemChecked = refreshUiReponse.success.refreshItemChecked;
            const xpGenerated = itemChecked?.check?.xpGenerated;
            if (itemChecked && xpGenerated && itemChecked.check.checked) {
                const groupItemId = itemChecked.groupItemId;
                setXpFloats(prev => ({ ...prev, [groupItemId]: xpGenerated }));
                const timerId = setTimeout(() => {
                    xpFloatTimers.current.delete(timerId);
                    setXpFloats(prev => {
                        const { [groupItemId]: _removed, ...rest } = prev;
                        return rest;
                    });
                }, XP_FLOAT_DURATION_MS);
                xpFloatTimers.current.add(timerId);
            }
        } else if (refreshUiReponse?.error) {
            toast.error(getFriendlyErrorMessage(t, refreshUiReponse.error));
        }
     }

     const handleSkip = async (groupToSkip: itemGroupToSkip) => {
        const refreshUiReponse = await skipRoutine(groupToSkip, t);
        if(refreshUiReponse?.success){
            setRefreshUi(refreshUiReponse.success);
        } else if (refreshUiReponse?.error) {
            toast.error(getFriendlyErrorMessage(t, refreshUiReponse.error));
        }
     }

    const mergedItems = getMergedItems();

    const renderItems = () => {
        return mergedItems.map((item, index) => {
            let itemObj: any;

            if (item.type === 'task') {
                itemObj = allTasks?.find(task => task.id === item.id);
                itemObj = {
                    ...itemObj,
                    item
                }
            } else {
                itemObj = allHabits?.find(habit => habit.id === item.id);
                itemObj = {
                    ...itemObj,
                    item
                }
            }

            if (!itemObj) return null;

            let currentDate = new Date().toJSON().slice(0, 10);
            const ItemCheck = item.check?.find((check) => check?.checkDate === currentDate);
            const checked: boolean = ItemCheck?.checked === true ? true : false;
            const skipped: boolean = ItemCheck?.skipped === true && !checked;
            // O XP fica NA LINHA depois de concluído (o XpFloat só marca o
            // instante do check e some). Vem do próprio check, então sobrevive
            // ao reload e mostra o valor real, já com decaimento aplicado.
            const xpEarned: number = checked ? (ItemCheck?.xpGenerated ?? 0) : 0;
            const motivationalPhrase = item.type === "habit" ? itemObj?.motivationalPhrase : "";
            const toastPosition = window.matchMedia("(min-width: 712px)").matches ? "top-left" : "bottom-center";

            return (
                <div key={`${item.type}-${item.id}-${index}`} className={`group w-full flex items-center justify-between gap-2 rounded-control px-2 py-1.5 mt-1 transition-colors duration-200 hover:bg-surface-2 ${skipped ? "opacity-60" : ""}`}>
                    <div className="relative flex items-center">
                        {xpFloats[itemObj.item.groupId] !== undefined && (
                            <XpFloat xp={xpFloats[itemObj.item.groupId]} />
                        )}
                        <label className="flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 -ml-2 cursor-pointer">
                        {/* O input continua sendo o alvo real (teclado, leitor de
                            tela, e2e); o anel é o desenho por cima dele. */}
                        <input
                            type="checkbox"
                            aria-label={itemObj.name}
                            className="peer sr-only"
                            checked={checked}
                            onChange={() => {
                                const groupToCheck: itemGroupToCheck = {
                                    routineId: routineId,
                                    ...(item.type === 'task'
                                        ? {
                                            taskGroupDTO: {
                                                taskGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                        : {
                                            habitGroupDTO: {
                                                habitGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                    )
                                };
                                handleCheck(groupToCheck);
                                if (!checked) {
                                    const message = motivationalPhrase ? motivationalPhrase : t("Item completed");
                                    toast.success(message, { position: toastPosition });
                                }
                            }}
                        />
                        <Ring
                            size={26}
                            state={checked ? "done" : skipped ? "skipped" : "todo"}
                            className="transition-transform duration-200 group-hover:scale-105 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface rounded-full"
                        />
                        </label>
                        <span className="ml-3 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                            <BeyouIcon id={itemObj.iconId} />
                        </span>
                        <span
                            className={`ml-3 truncate text-[13.5px] font-medium ${
                                checked || skipped ? "text-text-3" : "text-text"
                            } ${skipped ? "line-through" : ""}`}
                        >
                            {itemObj.name}
                        </span>

                        {/* The skipped state is already conveyed by the dimmed row,
                            the line-through name and the "Undo skip" button — no
                            extra "Skipped" label needed (saves mobile space). */}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        {xpEarned > 0 && (
                            <span className="rounded-full bg-xp-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-xp">
                                +{xpEarned} XP
                            </span>
                        )}
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-medium text-text-3">
                            {formatTimeRange(item.startTime, item.endTime)}
                        </span>
                    {!checked && (
                        <button
                            aria-label={skipped ? t("Undo skip") : t("Skip")}
                            title={skipped ? t("Undo skip") : t("Skip")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                            onClick={() => {
                                const groupToSkip: itemGroupToSkip = {
                                    routineId: routineId,
                                    skip: !skipped,
                                    ...(item.type === 'task'
                                        ? {
                                            taskGroupDTO: {
                                                taskGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                        : {
                                            habitGroupDTO: {
                                                habitGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                    )
                                };
                                handleSkip(groupToSkip);
                            }}
                        >
                            <FiSlash size={13} aria-hidden="true" />
                            {skipped ? t("Undo skip") : t("Skip")}
                        </button>
                    )}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex w-full flex-col items-start justify-center pb-1 pt-2.5">
            <div className="flex items-center gap-2.5 py-1.5">
                <span className="text-[15px] text-text-3">
                    <BeyouIcon id={section.iconId} />
                </span>
                <b className="truncate text-[12.5px] font-semibold text-text-2">{section.name}</b>
                <span className="whitespace-nowrap font-mono text-[11px] text-text-3">
                    {formatTimeRange(section.startTime, section.endTime)}
                </span>
            </div>

            <div className="mb-2 flex w-full flex-col items-start justify-start">
                {renderItems()}
            </div>

        </div>
    )
}
