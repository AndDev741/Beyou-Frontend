import type { Schemas } from "@beyou/contracts";
import type {
    BriefingGoal,
    BriefingNarrative,
    BriefingOpenItem,
    BriefingRecoveryWindow,
    BriefingToday,
    BriefingYesterday,
    DailyBriefing,
} from "@beyou/types/briefing/briefing";
import type { FocusCycle, FocusDay, FocusMicroTask } from "@beyou/types/focus/focus";
import type { MoodEntry } from "@beyou/types/mood/mood";
import type {
    Board,
    BoardChange,
    BoardEdge,
    BoardNode,
    ChatMessage,
    ChatTurn,
    Citation,
    ContinueStudying,
    DiscoveredSource,
    DiscoveryResult,
    DraftChoice,
    DraftNode,
    DueCard,
    DueCards,
    FinishReview,
    Flashcard,
    LinkRef,
    MiniEdge,
    MiniNode,
    NotebookHome,
    NotebookPage,
    NotebookSource,
    NotebookTree,
    Overview,
    PageRef,
    PageSearchHit,
    PageStatus,
    Passage,
    QuizAnswer,
    QuizQuestion,
    QuizResult,
    ReviewResult,
    ReviewSummary,
    RoadmapDraft,
    RoadmapDraftRecord,
    RoadmapDraftSummary,
    StatusChange,
    StudyOutput,
    StudyRoom,
    StudyScopeOption,
    StudySetup,
    SuggestedNode,
    TopicDue,
    TopicSummary,
    TreeItem,
} from "@beyou/types/notebook/notebook";

/**
 * Compile-time checks that the hand-written client types still match the API contract.
 *
 * The briefing, focus, mood and notebook types in @beyou/types are written by hand for readable
 * names and narrow unions, and nothing tied them to the generated contract: a backend rename
 * passed every typecheck and turned into `undefined` on screen. Each line below says "every field
 * the client reads exists on the DTO the server sends". It checks names, not optionality, because
 * the generated schema marks most fields optional whatever the server guarantees.
 *
 * A failure here reads as `Type '"someField"' does not satisfy the constraint 'never'`: the field
 * was renamed or removed on the server, or the snapshot in @beyou/contracts needs refreshing.
 */
type FieldsMissingFromWire<Client, Wire> = Exclude<keyof Client, keyof Wire>;
type Matches<Missing extends never> = Missing;

export type ContractChecks = [
    // Daily briefing
    Matches<FieldsMissingFromWire<DailyBriefing, Schemas["DailyBriefingResponseDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingYesterday, Schemas["BriefingYesterdayRecapDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingToday, Schemas["BriefingTodayAheadDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingOpenItem, Schemas["BriefingOpenItemDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingGoal, Schemas["BriefingGoalAheadDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingRecoveryWindow, Schemas["BriefingRecoveryWindowDTO"]>>,
    Matches<FieldsMissingFromWire<BriefingNarrative, Schemas["BriefingNarrativeDTO"]>>,
    // Mood
    Matches<FieldsMissingFromWire<MoodEntry, Schemas["MoodEntryResponseDTO"]>>,
    // Focus
    Matches<FieldsMissingFromWire<FocusCycle, Schemas["FocusCycleResponseDTO"]>>,
    Matches<FieldsMissingFromWire<FocusMicroTask, Schemas["FocusMicroTaskResponseDTO"]>>,
    Matches<FieldsMissingFromWire<FocusDay, Schemas["FocusDayResponseDTO"]>>,
    // Notebook: pages, home, trees and search
    Matches<FieldsMissingFromWire<NotebookPage, Schemas["PageResponseDTO"]>>,
    Matches<FieldsMissingFromWire<PageRef, Schemas["PageRefDTO"]>>,
    Matches<FieldsMissingFromWire<LinkRef, Schemas["LinkRefDTO"]>>,
    Matches<FieldsMissingFromWire<NotebookHome, Schemas["HomeResponseDTO"]>>,
    Matches<FieldsMissingFromWire<ContinueStudying, Schemas["ContinueDTO"]>>,
    Matches<FieldsMissingFromWire<TopicSummary, Schemas["TopicSummaryDTO"]>>,
    Matches<FieldsMissingFromWire<ReviewSummary, Schemas["ReviewSummaryDTO"]>>,
    Matches<FieldsMissingFromWire<TopicDue, Schemas["TopicDueDTO"]>>,
    Matches<FieldsMissingFromWire<NotebookTree, Schemas["TreeResponseDTO"]>>,
    Matches<FieldsMissingFromWire<TreeItem, Schemas["TreeItemDTO"]>>,
    Matches<FieldsMissingFromWire<PageStatus, Schemas["PageStatusDTO"]>>,
    Matches<FieldsMissingFromWire<StatusChange, Schemas["StatusChangeResponseDTO"]>>,
    Matches<FieldsMissingFromWire<PageSearchHit, Schemas["PageSearchHitDTO"]>>,
    // Notebook: boards
    Matches<FieldsMissingFromWire<Board, Schemas["BoardResponseDTO"]>>,
    Matches<FieldsMissingFromWire<BoardNode, Schemas["BoardNodeDTO"]>>,
    Matches<FieldsMissingFromWire<BoardEdge, Schemas["BoardEdgeDTO"]>>,
    Matches<FieldsMissingFromWire<BoardChange, Schemas["BoardChangeResponseDTO"]>>,
    Matches<FieldsMissingFromWire<MiniNode, Schemas["MiniNodeDTO"]>>,
    Matches<FieldsMissingFromWire<MiniEdge, Schemas["MiniEdgeDTO"]>>,
    // Notebook: cards and review
    Matches<FieldsMissingFromWire<Flashcard, Schemas["CardDTO"]>>,
    Matches<FieldsMissingFromWire<DueCard, Schemas["DueCardDTO"]>>,
    Matches<FieldsMissingFromWire<DueCards, Schemas["DueCardsResponseDTO"]>>,
    Matches<FieldsMissingFromWire<ReviewResult, Schemas["ReviewResponseDTO"]>>,
    Matches<FieldsMissingFromWire<FinishReview, Schemas["FinishReviewResponseDTO"]>>,
    // Notebook: sources and the study room
    Matches<FieldsMissingFromWire<NotebookSource, Schemas["SourceDTO"]>>,
    Matches<FieldsMissingFromWire<Passage, Schemas["PassageDTO"]>>,
    Matches<FieldsMissingFromWire<Citation, Schemas["CitationDTO"]>>,
    Matches<FieldsMissingFromWire<ChatMessage, Schemas["ChatMessageDTO"]>>,
    Matches<FieldsMissingFromWire<ChatTurn, Schemas["ChatTurnDTO"]>>,
    Matches<FieldsMissingFromWire<StudyOutput, Schemas["StudyOutputDTO"]>>,
    Matches<FieldsMissingFromWire<Overview, Schemas["OverviewDTO"]>>,
    Matches<FieldsMissingFromWire<QuizQuestion, Schemas["QuizQuestionDTO"]>>,
    Matches<FieldsMissingFromWire<QuizAnswer, Schemas["QuizAnswerDTO"]>>,
    Matches<FieldsMissingFromWire<QuizResult, Schemas["QuizResultDTO"]>>,
    Matches<FieldsMissingFromWire<StudyRoom, Schemas["StudyResponseDTO"]>>,
    Matches<FieldsMissingFromWire<StudySetup, Schemas["StudySetupDTO"]>>,
    Matches<FieldsMissingFromWire<StudyScopeOption, Schemas["StudyScopeOptionDTO"]>>,
    Matches<FieldsMissingFromWire<DiscoveredSource, Schemas["DiscoveredSourceDTO"]>>,
    Matches<FieldsMissingFromWire<DiscoveryResult, Schemas["DiscoveryResultDTO"]>>,
    // Notebook: AI roadmap drafts
    Matches<FieldsMissingFromWire<DraftNode, Schemas["DraftNodeDTO"]>>,
    Matches<FieldsMissingFromWire<RoadmapDraft, Schemas["RoadmapDraftDTO"]>>,
    Matches<FieldsMissingFromWire<RoadmapDraftRecord, Schemas["RoadmapDraftRecordDTO"]>>,
    Matches<FieldsMissingFromWire<RoadmapDraftSummary, Schemas["RoadmapDraftSummaryDTO"]>>,
    Matches<FieldsMissingFromWire<DraftChoice, Schemas["DraftChoiceDTO"]>>,
    Matches<FieldsMissingFromWire<SuggestedNode, Schemas["SuggestedNodeDTO"]>>,
];
