import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, FileText, Layers, Link2, Plus, Search, Sparkles } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookHome, enterNotebookTree } from "@beyou/state";
import { createPage, getNotebookHome, getTopicTree } from "@beyou/api/notebook";
import type { TreeItem } from "@beyou/types/notebook/notebook";
import StatusIcon from "./StatusIcon";

/**
 * The topic's pages, as a tree, beside the page being read.
 *
 * Children are listed in board order first (they are nodes), then the pages that sit under the
 * same parent without being on its board, marked with a page icon. Linked nodes show a link mark:
 * they live in another topic, and their own children are listed there.
 */
export default function PageTree({ topicId, currentPageId }: { topicId: string; currentPageId: string }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const tree = useSelector((state: RootState) => state.notebook.trees[topicId]);
    const topics = useSelector((state: RootState) => state.notebook.home?.topics ?? []);
    const statuses = useSelector((state: RootState) => state.notebook.pages);
    const [query, setQuery] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        void getTopicTree(topicId, t).then((r) => r.success && dispatch(enterNotebookTree(r.success)));
    }, [topicId, currentPageId, t, dispatch]);

    useEffect(() => {
        if (topics.length === 0) void getNotebookHome(t).then((r) => r.success && dispatch(enterNotebookHome(r.success)));
    }, [topics.length, t, dispatch]);

    const children = useMemo(() => {
        const map = new Map<string, TreeItem[]>();
        for (const item of tree?.items ?? []) {
            const list = map.get(item.parentId) ?? [];
            list.push(item);
            map.set(item.parentId, list);
        }
        for (const list of map.values()) list.sort((a, b) => a.position - b.position);
        return map;
    }, [tree]);

    const matches = (item: TreeItem) => !query || item.title.toLowerCase().includes(query.toLowerCase());

    const addPage = async () => {
        const response = await createPage({ parentId: currentPageId, title: t("NotebookUntitled") }, t);
        if (response.success) navigate(`/notebook/${response.success.id}`);
    };

    const render = (parentId: string, depth: number, seen: Set<string>): JSX.Element[] =>
        (children.get(parentId) ?? []).flatMap((item) => {
            if (seen.has(item.id)) return [];
            const next = new Set(seen).add(item.id);
            const kids = item.linked ? [] : children.get(item.id) ?? [];
            const open = !collapsed.has(item.id);
            const status = statuses[item.id]?.status ?? item.status;
            const row = matches(item) ? (
                <div key={`${parentId}-${item.id}`} className="flex items-center" style={{ paddingLeft: depth * 14 }}>
                    {kids.length > 0 ? (
                        <button type="button" aria-label={open ? t("NotebookCollapse") : t("NotebookExpand")}
                            onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
                            className="flex h-7 w-5 items-center justify-center text-text-3">
                            {open ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}
                    <NavLink
                        to={`/notebook/${item.id}`}
                        data-testid="tree-item"
                        className={({ isActive }) =>
                            `flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-[13px] ${
                                isActive ? "bg-accent-soft font-semibold text-accent" : "text-text hover:bg-surface-2"
                            }`
                        }
                    >
                        {item.onBoard ? <StatusIcon status={status} size={14} /> : <FileText size={14} className="shrink-0 text-text-3" aria-hidden="true" />}
                        <span className="truncate">{item.title}</span>
                        {item.linked && <Link2 size={12} className="shrink-0 text-text-3" aria-label={t("NotebookNodeLinked")} />}
                        {item.progress.total > 1 && (
                            <span className="ml-auto font-mono text-[11px] text-text-2">{item.progress.done}/{item.progress.total}</span>
                        )}
                    </NavLink>
                </div>
            ) : null;
            return [row, ...(open || query ? render(item.id, depth + 1, next) : [])].filter(Boolean) as JSX.Element[];
        });

    return (
        <nav aria-label={t("NotebookTreeLabel")} className="flex flex-col gap-3 lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border lg:px-2.5 lg:py-4">
            <div className="relative">
                <button type="button" onClick={() => setSwitching((v) => !v)} aria-expanded={switching}
                    className="flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-sm font-semibold text-text hover:bg-surface-2">
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Layers size={14} aria-hidden="true" />
                    </span>
                    <span className="flex-1 truncate">{tree?.topic.title ?? ""}</span>
                    <ChevronDown size={14} className="text-text-3" aria-hidden="true" />
                </button>
                {switching && (
                    <ul className="absolute left-0 right-0 top-11 z-20 rounded-card border border-border bg-surface p-1 shadow-surface">
                        {topics.map((topic) => (
                            <li key={topic.id}>
                                <Link to={`/notebook/${topic.id}`} onClick={() => setSwitching(false)}
                                    className="block truncate rounded-lg px-2.5 py-2 text-sm text-text hover:bg-surface-2">
                                    {topic.title}
                                </Link>
                            </li>
                        ))}
                        <li><Link to="/notebook" className="block rounded-lg px-2.5 py-2 text-sm font-semibold text-accent hover:bg-surface-2">{t("NotebookAllTopics")}</Link></li>
                    </ul>
                )}
            </div>
            <label className="flex h-[34px] items-center gap-2 rounded-control border border-border bg-surface px-2.5 text-[13px] text-text-2">
                <Search size={14} aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("NotebookSearchPages")}
                    aria-label={t("NotebookSearchPages")} className="min-w-0 flex-1 bg-transparent text-text outline-none" />
            </label>
            <div className="flex flex-col gap-px">
                <NavLink to={`/notebook/${topicId}`} end
                    className={({ isActive }) => `flex h-[30px] items-center gap-2 rounded-lg px-2 text-[13px] font-semibold ${isActive ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-2"}`}>
                    <ChevronDown size={14} className="text-text-3" aria-hidden="true" />{tree?.topic.title ?? ""}
                </NavLink>
                {render(topicId, 1, new Set([topicId]))}
                <button type="button" onClick={addPage} data-testid="tree-add-page"
                    className="mt-1 flex h-[30px] items-center gap-2 rounded-lg px-2 pl-[22px] text-[13px] text-text-2 hover:bg-surface-2">
                    <Plus size={14} aria-hidden="true" />{t("NotebookAddPage")}
                </button>
            </div>
            <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2.5 text-[13px]">
                <Link to={`/notebook/${currentPageId}/study`} className="flex h-8 items-center gap-2 rounded-lg px-2 font-semibold text-text hover:bg-surface-2">
                    <Sparkles size={15} className="text-accent" aria-hidden="true" />{t("NotebookStudyRoom")}
                </Link>
                <span className="flex h-8 items-center gap-2 px-2 text-text">
                    <Link2 size={15} className="text-text-3" aria-hidden="true" />{t("NotebookSources")}
                    <span className="ml-auto font-mono text-[11px] text-text-2">{tree?.sourcesCount ?? 0}</span>
                </span>
                <Link to={`/notebook/review?page=${topicId}`} className="flex h-8 items-center gap-2 rounded-lg px-2 text-text hover:bg-surface-2">
                    <Layers size={15} className="text-text-3" aria-hidden="true" />{t("NotebookCardsTitle")}
                    {(tree?.cardsDue ?? 0) > 0 && (
                        <span className="ml-auto rounded-full bg-flame-soft px-2 text-[11px] font-semibold leading-5 text-flame">
                            {t("NotebookDueCount", { count: tree?.cardsDue ?? 0 })}
                        </span>
                    )}
                </Link>
            </div>
        </nav>
    );
}
