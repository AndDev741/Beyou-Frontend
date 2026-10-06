import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookPage } from "@beyou/state";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import getGoals from "@beyou/api/goals/getGoals";
import getCategories from "@beyou/api/categories/getCategories";
import { setTopicLinks } from "@beyou/api/notebook";
import type { NotebookPage } from "@beyou/types/notebook/notebook";
import { useSyncedHabits } from "../../hooks/useSyncedLists";

/**
 * A topic's goal, category and habit: what it is FOR, where its XP goes, and which habit a focus
 * session on it runs on. Three selects, replaced as a set, each optional.
 */
export default function TopicLinks({ topic }: { topic: NotebookPage }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const categories = useSelector((state: RootState) => state.categories.categories);
    const habits = useSelector((state: RootState) => state.habits.habits);
    const syncHabits = useSyncedHabits();

    useEffect(() => {
        if (goals.length === 0) void getGoals(t).then((r) => Array.isArray(r.success) && dispatch(enterGoals(r.success)));
        if (categories.length === 0) void getCategories(t).then((r) => Array.isArray(r.success) && dispatch(enterCategories(r.success)));
        if ((habits ?? []).length === 0) void syncHabits();
        // Once per topic: these lists live in the store and other pages keep them fresh.
    }, [topic.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async (patch: Partial<{ goalId: string | null; categoryId: string | null; habitId: string | null }>) => {
        const response = await setTopicLinks(topic.id, {
            goalId: topic.goal?.id ?? null,
            categoryId: topic.category?.id ?? null,
            habitId: topic.habit?.id ?? null,
            ...patch,
        }, t);
        if (response.success) dispatch(enterNotebookPage(response.success));
    };

    const select = (id: string, label: string, value: string | undefined, options: { id: string; name: string }[],
        onChange: (v: string | null) => void, hint: string) => (
        <>
            <dt className="text-text-2"><label htmlFor={id}>{label}</label></dt>
            <dd className="m-0 flex flex-wrap items-center gap-2">
                <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} data-testid={id}
                    className="h-[26px] max-w-[260px] rounded-full border-0 bg-surface-2 px-2.5 text-[13px] font-semibold text-text-2 outline-none focus:ring-2 focus:ring-accent">
                    <option value="">{t("NotebookLinkNone")}</option>
                    {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <span className="text-[13px] text-text-2">{hint}</span>
            </dd>
        </>
    );

    return (
        <>
            {select("topic-goal", t("NotebookLinkGoal"), topic.goal?.id, goals.map((g) => ({ id: g.id, name: g.name })),
                (v) => void save({ goalId: v }), "")}
            {select("topic-category", t("NotebookLinkCategory"), topic.category?.id, categories.map((c) => ({ id: c.id, name: c.name })),
                (v) => void save({ categoryId: v }), t("NotebookLinkCategoryHint"))}
            {select("topic-habit", t("NotebookLinkHabit"), topic.habit?.id, (habits ?? []).map((h) => ({ id: h.id, name: h.name })),
                (v) => void save({ habitId: v }), t("NotebookLinkHabitHint"))}
        </>
    );
}
