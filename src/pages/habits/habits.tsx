import { useDispatch, useSelector } from "react-redux";
import CreateHabit from "../../components/habits/createHabit";
import EditHabit from "../../components/habits/editHabit";
import RenderHabits from "../../components/habits/renderHabits";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useEffect, useMemo, useState } from "react";
import { habit } from "../../types/habit/habitType";
import SortFilterBar, { SortOption } from "../../components/filters/SortFilterBar";
import {
    compareNumbers,
    compareStrings,
    getTimestamp,
    sortItems
} from "../../components/utils/sortHelpers";
import { useTranslation } from "react-i18next";
import { setViewSort } from "../../redux/viewFilters/viewFiltersSlice";
import SpotlightTutorial, { SpotlightStep } from "../../components/tutorial/SpotlightTutorial";
import { clearTutorialPhase, getTutorialPhase, setTutorialPhase, type TutorialPhase } from "../../components/tutorial/tutorialStorage";
import editUser from "../../services/user/editUser";
import { tutorialCompletedEnter } from "../../redux/user/perfilSlice";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";

function Habits(){
    useAuthGuard();

    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isEditMode = useSelector((state: RootState) => state.editHabit.editMode);
    const [habits, setHabits] = useState<habit[]>([]);
    const sortBy = useSelector((state: RootState) => state.viewFilters.habits);
    const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
    const [tutorialPhase, setTutorialPhaseState] = useState<TutorialPhase | null>(() => getTutorialPhase());
    const [habitStep, setHabitStep] = useState(0);
    const hasHabits = habits.length > 0;

    const sortOptions: SortOption[] = [
        { value: "default", label: t("Default order") },
        { value: "name-asc", label: t("Name (A-Z)") },
        { value: "name-desc", label: t("Name (Z-A)") },
        { value: "level-desc", label: t("Level (High to Low)") },
        { value: "level-asc", label: t("Level (Low to High)") },
        { value: "xp-desc", label: t("XP (High to Low)") },
        { value: "xp-asc", label: t("XP (Low to High)") },
        { value: "importance-desc", label: t("Importance (High to Low)") },
        { value: "importance-asc", label: t("Importance (Low to High)") },
        { value: "difficulty-desc", label: t("Difficulty (High to Low)") },
        { value: "difficulty-asc", label: t("Difficulty (Low to High)") },
        { value: "created-desc", label: t("Newest first") },
        { value: "created-asc", label: t("Oldest first") }
    ];

    const sortedHabits = useMemo(() => {
        switch (sortBy) {
            case "name-asc":
                return sortItems(habits, (a, b) => compareStrings(a.name, b.name));
            case "name-desc":
                return sortItems(habits, (a, b) => compareStrings(b.name, a.name));
            case "level-desc":
                return sortItems(habits, (a, b) => compareNumbers(b.level, a.level));
            case "level-asc":
                return sortItems(habits, (a, b) => compareNumbers(a.level, b.level));
            case "xp-desc":
                return sortItems(habits, (a, b) => compareNumbers(b.xp, a.xp));
            case "xp-asc":
                return sortItems(habits, (a, b) => compareNumbers(a.xp, b.xp));
            case "importance-desc":
                return sortItems(habits, (a, b) => compareNumbers(b.importance, a.importance));
            case "importance-asc":
                return sortItems(habits, (a, b) => compareNumbers(a.importance, b.importance));
            case "difficulty-desc":
                return sortItems(habits, (a, b) => compareNumbers(b.dificulty, a.dificulty));
            case "difficulty-asc":
                return sortItems(habits, (a, b) => compareNumbers(a.dificulty, b.dificulty));
            case "created-desc":
                return sortItems(habits, (a, b) =>
                    compareNumbers(getTimestamp(b.createdAt), getTimestamp(a.createdAt))
                );
            case "created-asc":
                return sortItems(habits, (a, b) =>
                    compareNumbers(getTimestamp(a.createdAt), getTimestamp(b.createdAt))
                );
            default:
                return habits;
        }
    }, [habits, sortBy]);

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "habits", sortBy: value }));
    };

    useEffect(() => {
        if (isTutorialCompleted) {
            clearTutorialPhase();
            setTutorialPhaseState(null);
            return;
        }
        if (!tutorialPhase) {
            setTutorialPhase("intro");
            setTutorialPhaseState("intro");
            return;
        }
        if (tutorialPhase === "habits-dashboard") {
            setTutorialPhase("habits");
            setTutorialPhaseState("habits");
        }
    }, [isTutorialCompleted, tutorialPhase]);

    useEffect(() => {
        if (tutorialPhase !== "habits") return;
        setHabitStep(hasHabits ? 1 : 0);
    }, [tutorialPhase, hasHabits]);

    const completeTutorial = async () => {
        const response = await editUser({ isTutorialCompleted: true });
        if (response.error) {
            const message = getFriendlyErrorMessage(t, response.error);
            toast.error(message);
            return;
        }
        dispatch(tutorialCompletedEnter(true));
        clearTutorialPhase();
        setTutorialPhaseState(null);
    };

    const habitSteps: SpotlightStep[] = [
        {
            id: "create-habit",
            targetSelector: "[data-tutorial-id='habit-create-form']",
            titleKey: "TutorialSpotlightCreateHabitTitle",
            descriptionKey: "TutorialSpotlightCreateHabitDescription",
            position: "left",
            disableNext: !hasHabits
        },
        {
            id: "habit-list",
            targetSelector: "[data-tutorial-id='habit-card']",
            titleKey: "TutorialSpotlightHabitListTitle",
            descriptionKey: "TutorialSpotlightHabitListDescription",
            position: "bottom"
        }
    ];

    const showHabitSpotlight = !isTutorialCompleted && tutorialPhase === "habits";

    return(
        <div className="bg-background min-h-screen text-secondary flex flex-col">
            {showHabitSpotlight && (
                <SpotlightTutorial
                    steps={habitSteps}
                    isActive={showHabitSpotlight}
                    currentStep={habitStep}
                    onStepChange={setHabitStep}
                    onComplete={completeTutorial}
                    onSkip={completeTutorial}
                />
            )}
            <Header pageName={"YourHabits"} />
            <div className="flex flex-col lg:flex-row lg:justify-start lg:items-start pb-4 lg:mb-0 mt-4 px-3 lg:px-6">
                <div className="w-[100%]">
                    <SortFilterBar
                        title={t("Habits board")}
                        description={t("Sort results")}
                        options={sortOptions}
                        value={sortBy}
                        onChange={handleSortChange}
                        quickValues={["name-asc", "xp-desc", "level-desc"]}
                        className="mb-4"
                    />
                    <RenderHabits habits={sortedHabits} setHabits={setHabits}/>
                </div>
                <div className="lg:flex lg:flex-col w-[100%]">
                    <div className={`${isEditMode ? "hidden" : "block"}`}>
                        <CreateHabit setHabits={setHabits}/>
                    </div>
                    <div className={`${isEditMode ? "block" : "hidden"}`}>
                        <EditHabit setHabits={setHabits}/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Habits;
