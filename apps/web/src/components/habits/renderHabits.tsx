import getHabits from "@beyou/api/habits/getHabits";
import { useEffect } from "react";
import HabitBox from "./habitBox";
import { habit } from "@beyou/types/habit/habitType";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { editModeEnter } from "@beyou/state/habit/editHabitSlice";
import EmptyState from "../EmptyState";
import { Repeat, Search } from "lucide-react";

type renderHabitsProps = {
    habits: habit[],
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>,
    /** Sobrescreve o vazio quando a lista sumiu pela busca/filtro, não por falta de hábitos. */
    emptyTitle?: string,
    /** Limpa busca e filtros a partir do estado vazio. */
    onClearFilters?: () => void
}

function RenderHabits({habits, setHabits, emptyTitle, onClearFilters}: renderHabitsProps){
    const dispatch = useDispatch();
    const { t: tRhf } = useTranslation();

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);
    
    useEffect(() => {
        const returnHabits = async () => {
            const response = await getHabits(t);
            if(Array.isArray(response.success)){
                setHabits(response.success);
            }
        }
        returnHabits();
    }, [])

    const hasHabits = habits.length > 0;

    return(
        // Grid escaneável: 3 colunas no desktop, 1 no mobile. Vazio ocupa a
        // largura toda em vez de virar uma coluna espremida.
        <div
            className={`text-text ${hasHabits ? "grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3" : ""}`}
            data-tutorial-id="habits-grid"
        >
            {hasHabits ? (
                habits.map((habit, index) => (
                    <div key={habit.id} data-tutorial-id={index === 0 ? "habit-card" : undefined}>
                        <HabitBox
                        id={habit.id}
                        name={habit.name}
                        iconId={habit.iconId}
                        description={habit.description}
                        level={habit.level}
                        xp={habit.xp}
                        nextLevelXp={habit.nextLevelXp}
                        actualLevelXp={habit.actualLevelXp}
                        constance={habit.constance}
                        categories={habit.categories}
                        motivationalPhrase={habit.motivationalPhrase}
                        importance={habit.importance}
                        dificulty={habit.dificulty}
                        routines={habit.routines}
                        createdAt={habit.createdAt}
                        updatedAt={habit.updatedAt}
                        setHabits={setHabits}
                        />
                    </div>
                ))
            ) : emptyTitle ? (
                <EmptyState
                    icon={<Search size={20} aria-hidden="true" />}
                    title={emptyTitle}
                    description={tRhf('NoResultsDescription')}
                    actionLabel={onClearFilters ? tRhf('ClearFilters') : undefined}
                    onAction={onClearFilters}
                    variant="ghost"
                />
            ) : (
                <EmptyState
                    icon={<Repeat size={20} aria-hidden="true" />}
                    title={tRhf('0HabitsTitle')}
                    description={tRhf('0HabitsDescription')}
                />
            )}
        </div>
    )
}

export default RenderHabits;
