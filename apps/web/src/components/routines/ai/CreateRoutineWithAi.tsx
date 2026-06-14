import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../../modals/Modal";
import DescribeStep from "./DescribeStep";
import generateRoutine from "../../../services/ai/generateRoutine";
import materializeRoutine from "../../../services/ai/materializeRoutine";
import { sortDraft } from "../../../services/ai/sortDraft";
import { sectionsToDraft, materializeToSections } from "../../../services/ai/draftMapping";
import getHabits from "../../../services/habits/getHabits";
import getTasks from "../../../services/tasks/getTasks";
import getCategories from "../../../services/categories/getCategories";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import { getFriendlyErrorMessage } from "../../../services/apiError";
import { RoutineSection } from "@beyou/types/routine/routineSection";

type Step = "describe" | "loading";

type CreateRoutineWithAiProps = {
    onClose: () => void;
    /** Current routine name in the form — sent as base so the AI refines it. */
    currentName: string;
    /** Current form sections — base for refinement (empty = generate from scratch). */
    currentSections: RoutineSection[];
    /**
     * Applies the AI result into the form: the generated sections (with newly
     * created habits/tasks already persisted) plus the ids of what's new so the
     * form can badge them. Called once on success.
     */
    onApply: (name: string, sections: RoutineSection[], newItemIds: string[]) => void;
};

/**
 * AI assistant for the routine form: describe → loading → the new
 * categories/habits/tasks are persisted (materialize) and the structure is
 * injected into the form's section list, where the user edits it traditionally
 * (drag, reorder, inline time edits, selectors) and saves through the normal
 * Create/Edit button. Clicking ✨ again refines the CURRENT form state.
 */
const CreateRoutineWithAi = ({ onClose, currentName, currentSections, onApply }: CreateRoutineWithAiProps) => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const [step, setStep] = useState<Step>("describe");
    const [description, setDescription] = useState("");

    const hasBase = currentSections.length > 0;

    const run = async () => {
        setStep("loading");

        // 1. generate (LLM) — refine the current form if it has sections
        const generated = await generateRoutine(
            {
                description,
                previousDraft: hasBase ? sectionsToDraft(currentName, currentSections) : undefined,
                feedback: hasBase ? description : undefined,
                language: i18n.language?.startsWith("pt") ? "pt" : "en"
            },
            t
        );
        if (!generated.success) {
            toast.error(getFriendlyErrorMessage(t, generated.error));
            setStep("describe");
            return;
        }

        // 2. materialize — persist new entities, get back plain refs + new ids
        const materialized = await materializeRoutine(sortDraft(generated.success.draft), t);
        if (!materialized.success) {
            toast.error(getFriendlyErrorMessage(t, materialized.error));
            setStep("describe");
            return;
        }

        // 3. refresh slices so SectionItem can resolve the new habit/task names
        const [habits, tasks, categories] = await Promise.all([getHabits(t), getTasks(t), getCategories(t)]);
        if (habits?.success) dispatch(enterHabits(habits.success));
        if (tasks?.success) dispatch(enterTasks(tasks.success));
        if (categories?.success) dispatch(enterCategories(categories.success));

        // 4. inject into the form
        const result = materialized.success;
        const newItemIds = [...result.newHabitIds, ...result.newTaskIds];
        onApply(result.name, materializeToSections(result), newItemIds);
        toast.success(t("AiRoutineReady"));
        onClose();
    };

    return (
        <Modal isOpen onClose={onClose} labelledBy="ai-routine-title" dataTutorialId="ai-routine-modal">
            <h2 id="ai-routine-title" className="mb-4 text-center text-2xl text-secondary">
                {t(hasBase ? "AdjustWithAi" : "CreateWithAi")} ✨
            </h2>

            {step === "describe" && (
                <DescribeStep
                    description={description}
                    setDescription={setDescription}
                    onGenerate={run}
                    mode={hasBase ? "edit" : "create"}
                />
            )}

            {step === "loading" && (
                <div className="flex flex-col items-center py-10" data-testid="ai-loading">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="mt-4 animate-pulse text-primary">{t("GeneratingRoutine")}</p>
                </div>
            )}
        </Modal>
    );
};

export default CreateRoutineWithAi;
