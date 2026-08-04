import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FiSearch, FiX, FiPlus } from "react-icons/fi";
import { RootState } from "@beyou/state/rootReducer";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { getSectionErrorKeys, isOvernightRange } from "@beyou/validation/routineValidation";
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

const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const fromMinutes = (minutes: number) => {
    const total = ((minutes % 1440) + 1440) % 1440;
    return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

/**
 * Horários sugeridos em sequência dentro da janela da seção.
 *
 * O formulário antigo pedia início e fim ANTES de escolher o item, e só deixava
 * adicionar um por vez. Aqui a seção já define a janela: os itens escolhidos
 * dividem o que sobra dela, em ordem, e cada linha continua editável depois —
 * é mais rápido corrigir um horário sugerido do que digitar dois do zero.
 */
export function suggestSlots(
    section: RoutineSection,
    count: number
): { startTime: string; endTime?: string }[] {
    if (count <= 0 || !section.startTime) return [];

    const overnight = isOvernightRange(section.startTime, section.endTime);
    const sectionStart = toMinutes(section.startTime);
    const sectionEnd = section.endTime
        ? toMinutes(section.endTime) + (overnight ? 1440 : 0)
        : undefined;

    // Retoma de onde os itens já existentes pararam.
    const existingEnds = [...(section.habitGroup ?? []), ...(section.taskGroup ?? [])].map((item) => {
        const end = item.endTime || item.startTime;
        if (!end) return sectionStart;
        const value = toMinutes(end);
        return overnight && value < sectionStart ? value + 1440 : value;
    });
    const cursor = existingEnds.length > 0 ? Math.max(sectionStart, ...existingEnds) : sectionStart;

    // Sem hora de término na seção, cada item ganha 15 minutos em fila.
    const DEFAULT_SLOT = 15;
    const remaining = sectionEnd !== undefined ? Math.max(sectionEnd - cursor, 0) : undefined;
    const slot = remaining !== undefined ? Math.max(Math.floor(remaining / count), 1) : DEFAULT_SLOT;

    return Array.from({ length: count }, (_, i) => {
        const start = cursor + slot * i;
        const end = sectionEnd !== undefined ? Math.min(start + slot, sectionEnd) : start + slot;
        return { startTime: fromMinutes(start), endTime: fromMinutes(end) };
    });
}

const TaskAndHabitSelector = ({ setRoutineSection, index, section, setOpenTaskSelector }: TaskSelectorProps) => {
    const { t } = useTranslation();
    const habits = useSelector((state: RootState) => state.habits.habits);
    const tasks = useSelector((state: RootState) => state.tasks.tasks);

    const [kind, setKind] = useState<Kind>("habit");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showQuickHabit, setShowQuickHabit] = useState(false);
    const [showQuickTask, setShowQuickTask] = useState(false);

    // A seção precisa de nome e hora de início para receber item — sem isso não
    // existe janela onde encaixar o horário sugerido.
    const sectionErrors = getSectionErrorKeys(section.name, section.startTime);
    const errorMessage = sectionErrors.length > 0 ? t(sectionErrors[0]) : "";

    const close = () => setOpenTaskSelector?.(false);

    const candidates = useMemo<Candidate[]>(() => {
        const query = search.trim().toLowerCase();
        const list: Candidate[] =
            kind === "habit"
                ? habits.map((habit) => ({
                      id: habit.id,
                      name: habit.name,
                      iconId: habit.iconId,
                      category: habit.categories?.[0]?.name ?? "",
                      alreadyIn: Boolean(section.habitGroup?.some((group) => group.habitId === habit.id)),
                  }))
                : tasks.map((task) => ({
                      id: task.id,
                      name: task.name,
                      iconId: task.iconId,
                      category: Object.values(task.categories ?? {})[0]?.name ?? "",
                      alreadyIn: Boolean(section.taskGroup?.some((group) => group.taskId === task.id)),
                  }));

        return query ? list.filter((item) => item.name.toLowerCase().includes(query)) : list;
    }, [habits, tasks, kind, search, section.habitGroup, section.taskGroup]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /** Adiciona ids do tipo informado, com horários sugeridos em sequência. */
    const addToSection = (ids: string[], itemKind: Kind) => {
        if (!setRoutineSection || ids.length === 0) return;
        const slots = suggestSlots(section, ids.length);

        setRoutineSection((prev) =>
            prev.map((sectionItem, idx) => {
                if (idx !== index) return sectionItem;
                if (itemKind === "habit") {
                    return {
                        ...sectionItem,
                        habitGroup: [
                            ...(sectionItem.habitGroup || []),
                            ...ids.map((habitId, i) => ({ habitId, ...slots[i] })),
                        ],
                    };
                }
                return {
                    ...sectionItem,
                    taskGroup: [
                        ...(sectionItem.taskGroup || []),
                        ...ids.map((taskId, i) => ({ taskId, ...slots[i] })),
                    ],
                };
            })
        );
    };

    const handleAdd = () => {
        addToSection([...selected], kind);
        close();
    };

    // A criação rápida entra direto na seção: quem cria dali já queria adicionar.
    const handleQuickCreated = (itemKind: Kind) => (id?: string) => {
        if (!id) return;
        addToSection([id], itemKind);
        close();
    };

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

                <div className="relative mt-3.5">
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
                    onChange={(value) => {
                        setKind(value);
                        setSelected(new Set());
                    }}
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
                        candidates.map((item) => {
                            const isSelected = selected.has(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isSelected || item.alreadyIn}
                                    disabled={item.alreadyIn}
                                    onClick={() => toggle(item.id)}
                                    className={`flex items-center gap-2.5 rounded-[9px] border px-2.5 py-[7px] text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isSelected ? "border-accent bg-accent-soft" : "border-border bg-surface"
                                    } ${item.alreadyIn ? "" : "hover:border-text-3/60"}`}
                                >
                                    <Ring size={20} state={isSelected || item.alreadyIn ? "done" : "todo"} />
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[13px] text-accent">
                                        <BeyouIcon id={item.iconId} />
                                    </span>
                                    <span
                                        className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${
                                            isSelected || item.alreadyIn ? "text-text" : "text-text-3"
                                        }`}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                                        {item.alreadyIn ? t("AlreadyInSection", { name: section.name }) : item.category}
                                    </span>
                                </button>
                            );
                        })
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
                    <Button
                        text={`${t("Add")}${selected.size > 0 ? ` ${selected.size}` : ""}`}
                        mode="primary"
                        size="small"
                        onClick={handleAdd}
                        disabled={selected.size === 0 || sectionErrors.length > 0}
                    />
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
