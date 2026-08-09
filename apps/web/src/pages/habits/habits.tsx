import { useDispatch, useSelector } from "react-redux";
import CreateHabit from "../../components/habits/createHabit";
import EditHabit from "../../components/habits/editHabit";
import RenderHabits from "../../components/habits/renderHabits";
import { HABIT_FORM_TITLE_ID } from "../../components/habits/HabitForm";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "@beyou/state/rootReducer";
import { useMemo, useState } from "react";
import { habit } from "@beyou/types/habit/habitType";
import {
    compareNumbers,
    compareStrings,
    getTimestamp,
    sortItems
} from "../../components/utils/sortHelpers";
import { useTranslation } from "react-i18next";
import { setViewSort } from "@beyou/state/viewFilters/viewFiltersSlice";
import { editModeEnter } from "@beyou/state/habit/editHabitSlice";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useHabitsTutorial } from "../../components/tutorial/hooks/useHabitsTutorial";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import Modal from "../../components/modals/Modal";
import { Plus, Search } from "lucide-react";

type SortOption = {
    value: string;
    label: string;
};

const ALL_CATEGORIES = "all";

/** Height and surface shared by the bar's controls (input + selects). */
const CONTROL_CLASS =
    "h-10 rounded-control border border-border bg-surface text-sm text-text transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

function Habits(){
    useAuthGuard();

    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isEditMode = useSelector((state: RootState) => state.editHabit.editMode);
    const [habits, setHabits] = useState<habit[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
    const sortBy = useSelector((state: RootState) => state.viewFilters.habits);
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

    // The category filter comes from the habits themselves: only what is in use.
    const categoriesInUse = useMemo(() => {
        const byId = new Map<string, string>();
        habits.forEach((item) => {
            (item.categories ?? []).forEach((category) => {
                if (category?.id) {
                    byId.set(category.id, category.name);
                }
            });
        });
        return [...byId.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => compareStrings(a.name, b.name));
    }, [habits]);

    const visibleHabits = useMemo(() => {
        const term = search.trim().toLowerCase();
        return sortedHabits.filter((item) => {
            const matchesTerm =
                term === "" ||
                item.name.toLowerCase().includes(term) ||
                (item.description ?? "").toLowerCase().includes(term);
            const matchesCategory =
                categoryFilter === ALL_CATEGORIES ||
                (item.categories ?? []).some((category) => category?.id === categoryFilter);
            return matchesTerm && matchesCategory;
        });
    }, [sortedHabits, search, categoryFilter]);

    const isFiltered = search.trim() !== "" || categoryFilter !== ALL_CATEGORIES;
    // No dedicated search key in i18n: the label is composed from existing ones
    // (same convention as categories/goals) and capitalised in CSS.
    const searchLabel = t("HabitSearchPlaceholder");

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "habits", sortBy: value }));
    };

    // Create and edit happen in a modal: the whole page is left to the cards.
    const isFormOpen = isCreateOpen || isEditMode;
    const closeForm = () => {
        setIsCreateOpen(false);
        if (isEditMode) {
            dispatch(editModeEnter(false));
        }
    };

    const {
        habitSteps,
        habitStep,
        setHabitStep,
        showHabitSpotlight,
        onComplete,
        onSkip
    } = useHabitsTutorial({ hasHabits });

    return(
        <div className="flex min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full flex-col bg-bg px-4 py-6 text-text lg:px-7">
            {showHabitSpotlight && (
                <SpotlightTutorial
                    steps={habitSteps}
                    isActive={showHabitSpotlight}
                    currentStep={habitStep}
                    onStepChange={setHabitStep}
                    onComplete={onComplete}
                    onSkip={onSkip}
                />
            )}
            <PageHeader
                title={t("YourHabits")}
                subtitle={`${habits.length} ${t("Habits")} · ${categoriesInUse.length} ${t("Categories")}`}
                action={
                    <Button
                        text={t("CreateHabit")}
                        mode="primary"
                        size="medium"
                        icon={<Plus size={18} aria-hidden="true" />}
                        onClick={() => setIsCreateOpen(true)}
                        testId="create-habit"
                        collapseLabel
                        tutorialId="habit-create-form"
                    />
                }
            />

            {/* On phones the search takes the whole row and the filters drop to
                the line below, side by side — all three together squeezed the
                busca até sobrar só a lupa (`sm` aqui é 350px). */}
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative min-w-0 lg:flex-1">
                    <Search
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={searchLabel}
                        aria-label={searchLabel}
                        className={`${CONTROL_CLASS} w-full pl-9 pr-3 placeholder:text-text-3`}
                    />
                </div>

                <div className="flex gap-2">
                <select
                    value={sortBy}
                    onChange={(event) => handleSortChange(event.target.value)}
                    aria-label={t("Sort by")}
                    className={`${CONTROL_CLASS} min-w-0 flex-1 px-3 lg:w-[220px] lg:flex-none`}
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label={t("Categories")}
                    className={`${CONTROL_CLASS} min-w-0 flex-1 px-3 lg:w-[220px] lg:flex-none`}
                >
                    <option value={ALL_CATEGORIES}>{t("All")}</option>
                    {categoriesInUse.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                </div>
            </div>

            <RenderHabits
                habits={visibleHabits}
                setHabits={setHabits}
                emptyTitle={isFiltered && hasHabits ? t("NoResultsTitle") : undefined}
                onClearFilters={() => { setSearch(""); setCategoryFilter(ALL_CATEGORIES); }}
            />

            {isFormOpen && (
                <Modal isOpen onClose={closeForm} labelledBy={HABIT_FORM_TITLE_ID} className="max-w-xl">
                    {isEditMode ? (
                        <EditHabit setHabits={setHabits} onClose={closeForm} />
                    ) : (
                        <CreateHabit setHabits={setHabits} onClose={closeForm} />
                    )}
                </Modal>
            )}
        </div>
    );
}

export default Habits;
