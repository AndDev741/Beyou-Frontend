import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FiSearch, FiX, FiPlus } from "react-icons/fi";
import { RootState } from "@beyou/state/rootReducer";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { getSectionErrorKeys } from "@beyou/validation/routineValidation";
import { suggestSlots } from "@beyou/state";
import BeyouIcon from "../../../../ui/BeyouIcon";
import Ring from "../../../../ui/Ring";
import Button from "../../../Button";
import SegmentedControl from "../../../../ui/SegmentedControl";
import QuickCreateHabitModal from "./QuickCreateHabitModal";
import QuickCreateTaskModal from "./QuickCreateTaskModal";

interface TaskSelectorProps {
    setRoutineSection?: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
    section: RoutineSection;
    setOpenTaskSelector?: React.Dispatch<React.SetStateAction<boolean>>;
}

type Kind = "habit" | "task";

type Candidate = {
    id: string;
    name: string;
    iconId: string;
    /** Categoria mostrada à direita da linha. */
    category: string;
    alreadyIn: boolean;
};


/** Uma linha da bandeja: o item escolhido com o horário ainda editável. */
type TrayItem = {
    kind: Kind;
    refId: string;
    /** Id do grupo, quando a linha já existia na seção. */
    groupId?: string;
    startTime: string;
    endTime: string;
};

const toGroups = (tray: TrayItem[]) => ({
    habitGroup: tray
        .filter((item) => item.kind === "habit")
        .map(({ groupId, refId, startTime, endTime }) => ({
            ...(groupId ? { id: groupId } : {}),
            habitId: refId,
            startTime,
            endTime,
        })),
    taskGroup: tray
        .filter((item) => item.kind === "task")
        .map(({ groupId, refId, startTime, endTime }) => ({
            ...(groupId ? { id: groupId } : {}),
            taskId: refId,
            startTime,
            endTime,
        })),
});

/**
 * Escolher itens para a seção: um clique manda o item para a BANDEJA com um
 * horário sugerido dentro da janela da seção, e ali o horário ainda se ajusta.
 * Só ao confirmar a bandeja vira a seção.
 *
 * Antes era marcar tudo e adicionar no escuro: os horários só apareciam depois,
 * na lista da seção, e corrigi-los era outra viagem. Mesmo modelo do nativo.
 */
const TaskAndHabitSelector = ({ setRoutineSection, index, section, setOpenTaskSelector }: TaskSelectorProps) => {
    const { t } = useTranslation();
    const habits = useSelector((state: RootState) => state.habits.habits);
    const tasks = useSelector((state: RootState) => state.tasks.tasks);

    const [kind, setKind] = useState<Kind>("habit");
    const [search, setSearch] = useState("");
    // A bandeja começa com o que a seção já tem: assim dá para corrigir o
    // horário de um item antigo na mesma passada.
    const [tray, setTray] = useState<TrayItem[]>(() => [
        ...(section.habitGroup ?? []).map((group) => ({
            kind: "habit" as Kind,
            refId: group.habitId,
            groupId: group.id,
            startTime: group.startTime ?? "",
            endTime: group.endTime ?? "",
        })),
        ...(section.taskGroup ?? []).map((group) => ({
            kind: "task" as Kind,
            refId: group.taskId,
            groupId: group.id,
            startTime: group.startTime ?? "",
            endTime: group.endTime ?? "",
        })),
    ]);
    const [showQuickHabit, setShowQuickHabit] = useState(false);
    const [showQuickTask, setShowQuickTask] = useState(false);

    // A seção precisa de nome e hora de início para receber item — sem isso não
    // existe janela onde encaixar o horário sugerido.
    const sectionErrors = getSectionErrorKeys(section.name, section.startTime);
    const errorMessage = sectionErrors.length > 0 ? t(sectionErrors[0]) : "";

    const close = () => setOpenTaskSelector?.(false);

    const nameOf = (item: TrayItem) =>
        item.kind === "habit"
            ? habits.find((habit) => habit.id === item.refId)?.name ?? ""
            : tasks.find((task) => task.id === item.refId)?.name ?? "";

    const iconOf = (item: TrayItem) =>
        item.kind === "habit"
            ? habits.find((habit) => habit.id === item.refId)?.iconId ?? ""
            : tasks.find((task) => task.id === item.refId)?.iconId ?? "";

    const candidates = useMemo<Candidate[]>(() => {
        const query = search.trim().toLowerCase();
        const inTray = (id: string, itemKind: Kind) =>
            tray.some((item) => item.kind === itemKind && item.refId === id);
        const list: Candidate[] =
            kind === "habit"
                ? habits.map((habit) => ({
                      id: habit.id,
                      name: habit.name,
                      iconId: habit.iconId,
                      category: habit.categories?.[0]?.name ?? "",
                      alreadyIn: inTray(habit.id, "habit"),
                  }))
                : tasks.map((task) => ({
                      id: task.id,
                      name: task.name,
                      iconId: task.iconId,
                      category: Object.values(task.categories ?? {})[0]?.name ?? "",
                      alreadyIn: inTray(task.id, "task"),
                  }));

        return query ? list.filter((item) => item.name.toLowerCase().includes(query)) : list;
    }, [habits, tasks, kind, search, tray]);

    /** Manda o item para a bandeja com o horário que sobra da janela da seção. */
    const pick = (id: string, itemKind: Kind) => {
        setTray((prev) => {
            if (prev.some((item) => item.kind === itemKind && item.refId === id)) return prev;
            const slot = suggestSlots({ ...section, ...toGroups(prev) }, 1)[0];
            return [
                ...prev,
                {
                    kind: itemKind,
                    refId: id,
                    startTime: slot?.startTime ?? "",
                    endTime: slot?.endTime ?? "",
                },
            ];
        });
    };

    const drop = (item: TrayItem) =>
        setTray((prev) => prev.filter((row) => !(row.kind === item.kind && row.refId === item.refId)));

    const setTime = (item: TrayItem, field: "startTime" | "endTime", value: string) =>
        setTray((prev) =>
            prev.map((row) =>
                row.kind === item.kind && row.refId === item.refId ? { ...row, [field]: value } : row,
            ),
        );

    const confirm = () => {
        if (!setRoutineSection) return;
        const groups = toGroups(tray);
        setRoutineSection((prev) =>
            prev.map((sectionItem, idx) => (idx === index ? { ...sectionItem, ...groups } : sectionItem)),
        );
        close();
    };

    // A criação rápida cai na bandeja: quem cria dali já queria o item aqui.
    const handleQuickCreated = (itemKind: Kind) => (id?: string) => {
        if (!id) return;
        pick(id, itemKind);
    };

    const timeInputClass =
        "w-full rounded-control border border-border bg-surface px-2.5 py-1.5 font-mono text-[12.5px] text-text outline-none focus:ring-2 focus:ring-accent/40";

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={close}>
            <div
                className="flex max-h-[85vh] w-full max-w-md flex-col rounded-card border border-border bg-surface p-5 text-text shadow-surface"
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-selector-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <h2
                        id="item-selector-title"
                        className="min-w-0 truncate text-base font-semibold tracking-[-0.01em]"
                    >
                        {t("AddToSection", { name: section.name })}
                    </h2>
                    <button
                        type="button"
                        aria-label={t("Close")}
                        onClick={close}
                        className="ml-auto rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                    >
                        <FiX />
                    </button>
                </div>

                {/* A bandeja: o que vai entrar na seção, com o horário à mão. */}
                <div className="mt-3.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                        {t("Assigned")} ({tray.length})
                    </span>
                    {tray.length === 0 ? (
                        <p className="mt-1.5 text-[12.5px] text-text-3">{t("NothingAssignedYet")}</p>
                    ) : (
                        <div className="mt-1.5 flex max-h-[30vh] flex-col gap-1.5 overflow-y-auto">
                            {/* Nome em cima, horários embaixo — como no nativo.
                                Numa linha só, nome + dois campos de hora + o
                                remover não cabem nos 448px do modal e o nome
                                sobrava em uma letra. */}
                            {tray.map((item) => (
                                <div
                                    key={`${item.kind}-${item.refId}`}
                                    className="rounded-control border border-border bg-accent/5 px-2.5 py-2"
                                    data-testid={`tray-${item.kind}-${item.refId}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[13px] text-accent">
                                            <BeyouIcon id={iconOf(item)} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text">
                                            {nameOf(item)}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label={`${t("Remove")} ${nameOf(item)}`}
                                            onClick={() => drop(item)}
                                            className="shrink-0 rounded-lg p-1 text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                                        >
                                            <FiX />
                                        </button>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <label className="flex flex-col gap-1">
                                            <span className="text-[11px] font-semibold text-text-3">{t("Start")}</span>
                                            <input
                                                type="time"
                                                aria-label={`${t("Start time")} ${nameOf(item)}`}
                                                value={item.startTime}
                                                onChange={(event) => setTime(item, "startTime", event.target.value)}
                                                className={timeInputClass}
                                            />
                                        </label>
                                        <label className="flex flex-col gap-1">
                                            <span className="text-[11px] font-semibold text-text-3">{t("End")}</span>
                                            <input
                                                type="time"
                                                aria-label={`${t("End time")} ${nameOf(item)}`}
                                                value={item.endTime}
                                                onChange={(event) => setTime(item, "endTime", event.target.value)}
                                                className={timeInputClass}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative mt-3">
                    <FiSearch
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("SearchHabitOrTask")}
                        aria-label={t("SearchHabitOrTask")}
                        className="w-full rounded-control border border-border bg-surface py-2.5 pl-9 pr-3 text-[13.5px] text-text outline-none transition-colors duration-200 placeholder:text-text-3 focus:ring-2 focus:ring-accent/40"
                    />
                </div>

                <SegmentedControl
                    className="mt-2.5 w-full"
                    label={t("RoutineTypeLabel")}
                    value={kind}
                    onChange={setKind}
                    options={[
                        { value: "habit" as Kind, label: t("Habits") },
                        { value: "task" as Kind, label: t("Tasks") },
                    ]}
                />

                {errorMessage && <p className="mt-2.5 text-xs text-danger">{errorMessage}</p>}

                <div className="-mx-1 mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1">
                    {candidates.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-text-3">
                            {search ? t("IconNoResults") : t("No habits or task available, create one")}
                        </p>
                    ) : (
                        candidates.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="checkbox"
                                aria-checked={item.alreadyIn}
                                disabled={item.alreadyIn || sectionErrors.length > 0}
                                onClick={() => pick(item.id, kind)}
                                className={`flex items-center gap-2.5 rounded-[9px] border border-border bg-surface px-2.5 py-[7px] text-left transition-colors duration-200 hover:border-text-3/60 disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                <Ring size={20} state={item.alreadyIn ? "done" : "todo"} />
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[13px] text-accent">
                                    <BeyouIcon id={item.iconId} />
                                </span>
                                <span
                                    className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${
                                        item.alreadyIn ? "text-text" : "text-text-3"
                                    }`}
                                >
                                    {item.name}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-text-3">
                                    {item.alreadyIn ? t("AlreadyInSection", { name: section.name }) : item.category}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-[18px] flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => (kind === "habit" ? setShowQuickHabit(true) : setShowQuickTask(true))}
                        className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[12.5px] font-semibold text-text-2 transition-colors duration-200 hover:bg-surface-2 hover:text-text"
                    >
                        <FiPlus aria-hidden="true" />
                        {kind === "habit" ? t("NewHabit") : t("NewTask")}
                    </button>
                    <div className="flex items-center gap-2">
                        <Button text={t("Cancel")} mode="ghost" size="small" onClick={close} />
                        <Button
                            text={`${t("Add")}${tray.length > 0 ? ` ${tray.length}` : ""}`}
                            mode="primary"
                            size="small"
                            onClick={confirm}
                            disabled={sectionErrors.length > 0}
                        />
                    </div>
                </div>

                <QuickCreateHabitModal
                    isOpen={showQuickHabit}
                    onClose={() => setShowQuickHabit(false)}
                    onCreated={handleQuickCreated("habit")}
                />
                <QuickCreateTaskModal
                    isOpen={showQuickTask}
                    onClose={() => setShowQuickTask(false)}
                    onCreated={handleQuickCreated("task")}
                />
            </div>
        </div>
    );
};

export default TaskAndHabitSelector;
