import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { NotebookSource, StudyRoom, StudySetup as Setup } from "@beyou/types/notebook/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getStudyRoom } from "@beyou/api/notebook";
import ErrorNotice from "../../components/ErrorNotice";
import SourcesPanel from "../../components/notebook/study/SourcesPanel";
import ChatPanel from "../../components/notebook/study/ChatPanel";
import StudioPanel from "../../components/notebook/study/StudioPanel";
import StudySetup, { StudySetupBar } from "../../components/notebook/study/StudySetup";

/**
 * The study room for one page: its sources on the left, a conversation grounded in them in the
 * middle, and the studio on the right.
 *
 * Before the first question the middle column is the room's setup (StudySetup): a goal, which
 * notes to read, and sources to add. It comes back with "Edit" on the line above the chat. The
 * source list is held here, so the panel and the setup both see a source the other added.
 *
 * It covers the app shell like the focus screen does (`fixed inset-0`), because a study session
 * is one thing at a time and the sidebar is a way out of it. Escape leaves for the page, unless a
 * dialog is open: the shared `Modal` closes on Escape too, and one keypress must not do both.
 */
export default function NotebookStudyRoom() {
    const { pageId } = useParams<{ pageId: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [cards, setCards] = useState({ total: 0, due: 0 });
    const [sources, setSources] = useState<NotebookSource[]>([]);
    const [setup, setSetup] = useState<Setup | null>(null);
    const [editingSetup, setEditingSetup] = useState(false);

    const pagePath = `/notebook/${pageId ?? ""}`;
    const leave = useCallback(() => navigate(pagePath), [navigate, pagePath]);

    useEffect(() => {
        if (!pageId) return;
        let cancelled = false;
        (async () => {
            const response = await getStudyRoom(pageId, t);
            if (cancelled) return;
            if (response.success) {
                setRoom(response.success);
                setCards({ total: response.success.cardsTotal, due: response.success.cardsDue });
                setSources(response.success.sources);
                setSetup(response.success.setup);
            } else {
                setError(response.error ?? null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pageId, t]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (document.querySelector('[role="dialog"]')) return;
            leave();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [leave]);

    const onSourceAdded = useCallback((source: NotebookSource) => setSources((current) => [...current, source]), []);

    // Cards made in the chat or the studio are new, so they are due today.
    const onCardsMade = useCallback(
        (count: number) => setCards((current) => ({ total: current.total + count, due: current.due + count })),
        []
    );

    return (
        <div
            className="fixed inset-0 z-[70] overflow-y-auto bg-bg text-text"
            role="region"
            aria-label={t("NotebookStudyRoom")}
            data-testid="study-room"
        >
            <div className="flex min-h-full flex-col">
                <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Link
                            to={pagePath}
                            aria-label={t("NotebookStudyBackToPage")}
                            className="flex h-9 w-9 items-center justify-center rounded-control text-text-2 hover:bg-surface-2"
                        >
                            <ArrowLeft size={18} aria-hidden="true" />
                        </Link>
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                            <Sparkles size={16} aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-col">
                            <h1 className="truncate text-[15px] font-semibold">
                                {t("NotebookStudyRoom")}
                                {room ? ` · ${room.page.title}` : ""}
                            </h1>
                            {room && room.breadcrumb.length > 0 && (
                                <span className="truncate text-xs text-text-2">
                                    {room.breadcrumb.map((step) => step.title).join(" › ")}
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        to={pagePath}
                        className="inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-[13px] font-semibold text-text hover:bg-surface-2"
                    >
                        {t("Close")}
                        <kbd className="rounded-[5px] border border-border px-1.5 font-mono text-[11px] text-text-2">Esc</kbd>
                    </Link>
                </header>

                {error && (
                    <div className="p-6">
                        <ErrorNotice error={error} />
                    </div>
                )}

                {!room && !error && (
                    <p className="p-6 text-sm text-text-2" role="status">
                        {t("NotebookStudyLoading")}
                    </p>
                )}

                {room && pageId && setup && (
                    <div className="flex flex-1 flex-wrap items-stretch gap-4 p-4">
                        <div className="flex min-w-0 flex-[1_1_280px] flex-col lg:max-w-[320px]">
                            <SourcesPanel pageId={pageId} initialSources={sources} onChange={setSources} discovery={room.discovery} />
                        </div>
                        <div className="flex min-w-0 flex-[999_1_460px] flex-col">
                            {editingSetup || (!setup.configuredAt && room.messages.length === 0) ? (
                                <StudySetup
                                    pageId={pageId}
                                    setup={setup}
                                    scopes={room.scopes}
                                    sources={sources}
                                    discovery={room.discovery}
                                    onSourceAdded={onSourceAdded}
                                    onSaved={(saved) => {
                                        setSetup(saved);
                                        setEditingSetup(false);
                                    }}
                                    onCancel={setup.configuredAt ? () => setEditingSetup(false) : undefined}
                                />
                            ) : (
                                <>
                                    <StudySetupBar setup={setup} onEdit={() => setEditingSetup(true)} />
                                    <ChatPanel
                                        pageId={pageId}
                                        initialMessages={room.messages}
                                        initialOverview={room.overview}
                                        onCardsMade={onCardsMade}
                                    />
                                </>
                            )}
                        </div>
                        <div className="flex min-w-0 flex-[1_1_300px] flex-col lg:max-w-[340px]">
                            <StudioPanel
                                pageId={pageId}
                                pageTitle={room.page.title}
                                initialOutputs={room.outputs}
                                cardsTotal={cards.total}
                                cardsDue={cards.due}
                                onCardsMade={onCardsMade}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
