import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { getTopicTree } from "@beyou/api/notebook";
import { enterNotebookTree } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { TreeItem } from "@beyou/types/notebook/notebook";

export type TopicPageOption = { id: string; title: string; depth: number };

/**
 * A topic's pages for a picker: the topic itself first, then its pages depth first, the way the
 * sidebar tree nests them.
 *
 * Pages linked in from another topic are left out. A block may only point at a page of its own
 * topic (the server refuses the rest), so offering them would only lead to an error.
 *
 * Reads the tree the sidebar already keeps in the store and fetches it when nobody has yet.
 */
export function useTopicPages(topicId: string | null) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const tree = useSelector((state: RootState) => (topicId ? state.notebook.trees[topicId] : undefined));

    useEffect(() => {
        if (!topicId || tree) return;
        void getTopicTree(topicId, t).then((response) => {
            if (response.success) dispatch(enterNotebookTree(response.success));
        });
    }, [topicId, tree, dispatch, t]);

    const pages = useMemo<TopicPageOption[]>(() => {
        if (!tree) return [];
        const children = new Map<string, TreeItem[]>();
        for (const item of tree.items) {
            if (item.linked) continue;
            const siblings = children.get(item.parentId) ?? [];
            siblings.push(item);
            children.set(item.parentId, siblings);
        }
        const out: TopicPageOption[] = [{ id: tree.topic.id, title: tree.topic.title, depth: 0 }];
        const seen = new Set<string>([tree.topic.id]);
        const walk = (parentId: string, depth: number) => {
            for (const item of [...(children.get(parentId) ?? [])].sort((a, b) => a.position - b.position)) {
                if (seen.has(item.id)) continue;
                seen.add(item.id);
                out.push({ id: item.id, title: item.title, depth });
                walk(item.id, depth + 1);
            }
        };
        walk(tree.topic.id, 1);
        return out;
    }, [tree]);

    return { pages, loading: Boolean(topicId) && !tree };
}
