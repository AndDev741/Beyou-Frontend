import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Search, Target } from "lucide-react";
import { saveStudySetup } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { NotebookSource, StudyScope, StudyScopeOption, StudySetup as Setup } from "@beyou/types/notebook/notebook";
import ErrorNotice from "../../ErrorNotice";
import AddSourceDialog from "./AddSourceDialog";
import DiscoverSources from "./DiscoverSources";

export const SCOPE_KEYS: Record<StudyScope, { title: string; detail: string }> = {
    PAGE: { title: "NotebookScopePage", detail: "NotebookScopePageDetail" },
    SUBTREE: { title: "NotebookScopeSubtree", detail: "NotebookScopeSubtreeDetail" },
    TOPIC: { title: "NotebookScopeTopic", detail: "NotebookScopeTopicDetail" },
};

/**
 * The study room before the first question, or when the person reopens it: what they want out
 * of studying this page, which notes the AI reads, and what it may quote.
 *
 * The sources themselves stay in the panel beside this, with their switches; here the person
 * adds more, by hand or with "find sources for me". Saving stores the goal and the scope on the
 * page, and every answer on it uses them from then on.
 */
export default function StudySetup({ pageId, setup, scopes, sources, discovery, onSourceAdded, onSaved, onCancel }: {
    pageId: string;
    setup: Setup;
    scopes: StudyScopeOption[];
    sources: NotebookSource[];
    discovery: boolean;
    onSourceAdded: (source: NotebookSource) => void;
    onSaved: (setup: Setup) => void;
    /** Present when the room was set up before, so the person can back out of an edit. */
    onCancel?: () => void;
}) {
    const { t, i18n } = useTranslation();
    const [goal, setGoal] = useState(setup.goal ?? "");
    const [scope, setScope] = useState<StudyScope>(setup.scope);
    const [adding, setAdding] = useState(false);
    const [finding, setFinding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const on = sources.filter((s) => s.enabled).length;

    const save = async () => {
        setSaving(true);
        setError(null);
        const response = await saveStudySetup(pageId, { goal: goal.trim(), scope }, t);
        setSaving(false);
        if (response.success) onSaved(response.success);
        else setError(response.error ?? null);
    };

    return (
        <section aria-labelledby="study-setup-title" data-testid="study-setup"
            className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5">
            <div className="flex flex-col gap-1">
                <h2 id="study-setup-title" className="text-lg font-semibold text-text">{t("NotebookSetupTitle")}</h2>
                <p className="text-[13px] text-text-2">{t("NotebookSetupIntro")}</p>
            </div>

            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                <span className="inline-flex items-center gap-1.5"><Target size={14} className="text-accent" aria-hidden="true" />{t("NotebookSetupGoal")}</span>
                <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    maxLength={300}
                    placeholder={t("NotebookSetupGoalPlaceholder")}
                    data-testid="setup-goal"
                    className="h-[42px] rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent"
                />
                <span className="text-xs font-normal text-text-2">{t("NotebookSetupGoalHint")}</span>
            </label>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-[13px] font-semibold text-text">{t("NotebookSetupScope")}</legend>
                {scopes.map((option) => (
                    <label key={option.scope} data-testid={`setup-scope-${option.scope}`}
                        className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-3.5 py-3 ${
                            scope === option.scope ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2"
                        }`}>
                        <input type="radio" name="study-scope" value={option.scope} checked={scope === option.scope}
                            onChange={() => setScope(option.scope)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm font-semibold text-text">{t(SCOPE_KEYS[option.scope].title)}</span>
                            <span className="text-xs text-text-2">{t(SCOPE_KEYS[option.scope].detail)}</span>
                            <span className="font-mono text-[11px] text-text-2">
                                {t("NotebookSetupScopeCount", { count: option.pages, words: option.words.toLocaleString(i18n.language) })}
                            </span>
                        </span>
                    </label>
                ))}
            </fieldset>

            <div className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold text-text">{t("NotebookSetupSources")}</h3>
                <p className="text-xs text-text-2">
                    {sources.length === 0 ? t("NotebookSetupSourcesNone") : t("NotebookSetupSourcesOn", { on, total: sources.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setAdding(true)} data-testid="setup-add-source"
                        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-[13px] font-semibold text-text hover:bg-surface-2">
                        <Plus size={14} aria-hidden="true" />{t("NotebookSetupAddSource")}
                    </button>
                    {discovery && (
                        <button type="button" onClick={() => setFinding((v) => !v)} aria-expanded={finding} data-testid="setup-find-sources"
                            className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent-soft px-3 text-[13px] font-semibold text-accent">
                            <Search size={14} aria-hidden="true" />{t("NotebookDiscoverTitle")}
                        </button>
                    )}
                </div>
                {finding && (
                    <div className="rounded-[14px] border border-border bg-bg p-3">
                        <DiscoverSources pageId={pageId} onAdded={onSourceAdded} autoFocus />
                    </div>
                )}
            </div>

            <ErrorNotice error={error} />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="h-[42px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text">
                        {t("Cancel")}
                    </button>
                )}
                <button type="button" onClick={() => void save()} disabled={saving} data-testid="setup-start"
                    className="h-[42px] rounded-control bg-accent px-[18px] text-sm font-semibold text-on-accent disabled:opacity-60">
                    {onCancel ? t("NotebookSetupSave") : t("NotebookSetupStart")}
                </button>
            </div>

            <AddSourceDialog pageId={pageId} isOpen={adding} onClose={() => setAdding(false)} onAdded={onSourceAdded} />
        </section>
    );
}

/** The setup in one line above the chat, with the way back into it. */
export function StudySetupBar({ setup, onEdit }: { setup: Setup; onEdit: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border bg-surface px-3 py-2 text-xs text-text-2"
            data-testid="study-setup-bar">
            {setup.goal && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Target size={13} className="shrink-0 text-accent" aria-hidden="true" />
                    <span className="truncate" title={setup.goal}>{setup.goal}</span>
                </span>
            )}
            <span>{t("NotebookSetupReads", { scope: t(SCOPE_KEYS[setup.scope].title) })}</span>
            <button type="button" onClick={onEdit} data-testid="study-setup-edit"
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-text hover:bg-surface-2">
                <Pencil size={12} aria-hidden="true" />{t("NotebookSetupEdit")}
            </button>
        </div>
    );
}
