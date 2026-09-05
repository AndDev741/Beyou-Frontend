import { useEffect, useState, type ReactNode } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { goal as GoalType } from "@beyou/types/goals/goalType";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import DeleteModal from "../DeleteModal";
import GoalProgressModal from "./GoalProgressModal";
import getGoals from "@beyou/api/goals/getGoals";
import deleteGoal from "@beyou/api/goals/deleteGoal";
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, GitBranch, Maximize2, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  editModeEnter,
  editGoalIdEnter,
  editTitleEnter,
  editDescriptionEnter,
  editTargetValueEnter,
  editUnitEnter,
  editCurrentValueEnter,
  editCompleteEnter,
  editCategoryEnter,
  editMotivationEnter,
  editStartDateEnter,
  editEndDateEnter,
  editXpRewardEnter,
  editStatusEnter,
  editTermEnter,
  editIconIdEnter,
  editParentIdEnter,
} from "@beyou/state/goal/editGoalSlice";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Chip, { type ChipVariant } from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import XpBar from "../../ui/XpBar";
import Button from "../Button";
import markGoalAsComplete from "@beyou/api/goals/markGoalAsComplete";
import { enterGoals, updateGoal } from "@beyou/state/goal/goalsSlice";
import increaseCurrentValue from "@beyou/api/goals/increaseCurrentValue";
import decreaseCurrentValue from "@beyou/api/goals/decreaseCurrentValue";
import useUiRefresh from "../../hooks/useUiRefresh";
import {
  MAX_GOAL_DEPTH,
  allChildrenComplete,
  childrenOf,
  childrenSummary,
  formatGoalDeadline,
} from "@beyou/state";


type GoalBoxProps = {
  id: string;
  title: string;
  iconId: string;
  description: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: GoalType["categories"];
  motivation: string;
  startDate: Date;
  endDate: Date;
  xpReward: number;
  status: string;
  term: string;
  readonly?: boolean;
  parentId?: string | null;
  /** Direct sub-goals, already in the order the caller wants them shown. */
  subGoals?: GoalType[];
  /** The whole list, so nested rows and the children summary can be derived. */
  allGoals?: GoalType[];
  /** 1 for a main goal, 2 for its sub-goal, 3 for a leaf. Gates "Add sub-goal". */
  depth?: number;
  onAddSubGoal?: (parentId: string) => void;
  onOpenViewer?: (goalId: string) => void;
  /** Set when the card is shown away from its parent (flat list, filtered parent). */
  parentName?: string;
  /** Open the sub-goal list on mount (deep link into a child). */
  initialChildrenOpen?: boolean;
};

/** A small labelled action for the card's fold on phones: icon, name, one tap. */
function FoldAction({
  label,
  icon,
  onClick,
  danger = false,
  testId,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-[12px] font-semibold transition-colors duration-200 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
        danger ? "text-danger" : "text-text-2"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GoalBox({
  id,
  title,
  iconId,
  description,
  targetValue,
  unit,
  currentValue,
  complete,
  categories,
  motivation,
  startDate,
  endDate,
  xpReward,
  status,
  term,
  readonly = false,
  parentId = null,
  subGoals = [],
  allGoals = [],
  depth = 1,
  onAddSubGoal,
  onOpenViewer,
  parentName,
  initialChildrenOpen = false,
}: GoalBoxProps) {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [onDelete, setOnDelete] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(initialChildrenOpen);

  useEffect(() => {
    if (initialChildrenOpen) setChildrenOpen(true);
  }, [initialChildrenOpen]);
  const [termPhrase, setTermPhrase] = useState("");
  const [statusPhrase, setStatusPhrase] = useState("");
  const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

  // "Complete" is what pays the XP, so it only shows once the target is hit;
  // before that the card shows the stepper's +. A targetValue of 0 never
  // "reaches the target".
  const targetReached = targetValue > 0 && currentValue >= targetValue;
  const statusVariant: ChipVariant =
    status === "COMPLETED" ? "ok" : status === "IN_PROGRESS" ? "accent" : "neutral";
  const categoryEntries = Object.entries(categories ?? {});
  const hasSubGoals = subGoals.length > 0;
  // Derived from the flat list rather than from the rows: the summary must agree with
  // the viewer and the mobile card, which read the same helper.
  const summary = hasSubGoals ? childrenSummary(allGoals, id) : null;
  const childrenDone = hasSubGoals && allChildrenComplete(allGoals, id);
  const canAddSubGoal = !readonly && Boolean(onAddSubGoal) && depth < MAX_GOAL_DEPTH;

  function handleEditMode() {
    dispatch(editModeEnter(true));
    dispatch(editGoalIdEnter(id));
    dispatch(editTitleEnter(title));
    dispatch(editIconIdEnter(iconId));
    dispatch(editDescriptionEnter(description));
    dispatch(editTargetValueEnter(targetValue));
    dispatch(editUnitEnter(unit));
    dispatch(editCurrentValueEnter(currentValue));
    dispatch(editCompleteEnter(complete));
    dispatch(editCategoryEnter(categories));
    dispatch(editMotivationEnter(motivation));
    dispatch(editStartDateEnter(startDate));
    dispatch(editEndDateEnter(endDate));
    dispatch(editXpRewardEnter(xpReward));
    dispatch(editStatusEnter(status));
    dispatch(editTermEnter(term));
    dispatch(editParentIdEnter(parentId));
  }

  useUiRefresh(refreshUi);

  useEffect(() => {
    switch (term) {
      case "SHORT_TERM":
        setTermPhrase(t('Short Term'));
        break;
      case "MEDIUM_TERM":
        setTermPhrase(t('Medium Term'));
        break;
      case "LONG_TERM":
        setTermPhrase(t('Long Term'));
        break;
      default:
        break;
    }

    switch (status) {
      case "NOT_STARTED":
        setStatusPhrase(t('Not Started'));
        break;
      case "IN_PROGRESS":
        setStatusPhrase(t('In Progress'));
        break;
      case "COMPLETED":
        setStatusPhrase(t('Completed'));
        break;
      default:
        break;
    }

  }, [iconId, term, status]);

  // Deadline shared with mobile: day and month, plus the year when it is not the
  // current one — "by Jul 24 - 2027" cannot be read as this July.
  const formatDate = (dateString: string) => formatGoalDeadline(dateString, i18n.language);

  const completeTask = async (id: string) => {
    const refreshUi = await markGoalAsComplete(id, t);
    if(refreshUi?.success){
      setRefreshUi(refreshUi.success);
    }

    const goals = await getGoals(t);
    dispatch(enterGoals(goals.success));
  }

  const increaseTask = async (id: string, amount = 1) => {
    const goal = await increaseCurrentValue(id, t, amount);
    mountGoalWithNewValues(goal);
  }

  const decreaseTask = async (id: string, amount = 1) => {
    const goal = await decreaseCurrentValue(id, t, amount);
    mountGoalWithNewValues(goal);
  }

  const applyProgress = async (amount: number, direction: "increase" | "decrease") => {
    if (direction === "increase") {
      await increaseTask(id, amount);
      return;
    }
    await decreaseTask(id, amount);
  }

  const mountGoalWithNewValues = (goal: GoalType) => {
    dispatch(updateGoal(goal));
  }

  const isCompleted = status === "COMPLETED";

  const refreshGoals = async () => {
    const goals = await getGoals(t);
    if (Array.isArray(goals.success)) dispatch(enterGoals(goals.success));
  };

  const increaseChild = async (childId: string) => {
    const updated = await increaseCurrentValue(childId, t, 1);
    if (updated?.id) {
      dispatch(updateGoal(updated));
    } else {
      await refreshGoals();
    }
    // The first increment in a sub-goal starts its parent server-side; the card's own
    // status chip only follows if the list is refreshed.
    if (status === "NOT_STARTED") await refreshGoals();
  };

  const completeChild = async (childId: string) => {
    const refresh = await markGoalAsComplete(childId, t);
    if (refresh?.success) setRefreshUi(refresh.success);
    await refreshGoals();
  };

  /**
   * One compact row per sub-goal: icon, name, its own bar and counter, and the one
   * action that matters right now (plus, or Complete once the target lands). A row
   * with rows of its own repeats once more, indented, so the three levels the server
   * allows are all visible from the main goal's card.
   */
  const renderChildRow = (child: GoalType, level: number) => {
    const childDone = child.status === "COMPLETED";
    const childReached = child.targetValue > 0 && child.currentValue >= child.targetValue;
    const grandChildren = allGoals.length
      ? childrenOf(allGoals, child.id).sort(
          (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
        )
      : [];
    return (
      <li key={child.id} data-testid={`subgoal-row-${child.id}`}>
        <div
          className={`flex items-center gap-2 rounded-control px-2 py-1.5 ${level > 1 ? "ml-5" : ""} ${
            childDone ? "opacity-70" : ""
          }`}
        >
          <IconTile size={24} tone={childDone ? "neutral" : "accent"}>
            <BeyouIcon id={child.iconId} size={13} />
          </IconTile>
          <span
            className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${childDone ? "text-text-3 line-through" : "text-text"}`}
            title={child.name}
          >
            {child.name}
          </span>
          <XpBar className="hidden w-16 sm:block" current={child.currentValue} target={child.targetValue} compact />
          <span className="shrink-0 font-mono text-[11px] text-text-3">
            {child.currentValue}/{child.targetValue}
          </span>
          {!readonly && !childDone && (
            childReached ? (
              <Button
                text={t("Complete")}
                size="small"
                mode="tonal"
                onClick={() => completeChild(child.id)}
                className="!h-7 !px-2.5 !text-[11px]"
              />
            ) : (
              <IconButton
                label={`${t("Increase")}: ${child.name}`}
                onClick={() => increaseChild(child.id)}
                className="!h-7 !w-7 border border-border"
              >
                <Plus size={13} aria-hidden="true" />
              </IconButton>
            )
          )}
        </div>
        {grandChildren.length > 0 && level < MAX_GOAL_DEPTH - 1 && (
          <ul className="flex flex-col">{grandChildren.map((gc) => renderChildRow(gc, level + 1))}</ul>
        )}
      </li>
    );
  };

  const counterText = `${currentValue}/${targetValue} ${unit}`;
  // Read-only cards (the dashboard carousel) keep the plain number: there is
  // nothing to press there.
  const counter = readonly ? (
    <span className="shrink-0 font-mono text-xs font-semibold text-text-2">{counterText}</span>
  ) : (
    <button
      type="button"
      onClick={() => setProgressOpen(true)}
      title={t("UpdateProgress")}
      aria-label={`${t("UpdateProgress")}: ${counterText}`}
      className="shrink-0 rounded-control px-1 font-mono text-xs font-semibold text-text-2 underline-offset-4 transition-colors duration-200 hover:text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      {counterText}
    </button>
  );

  return (
    <Card
      interactive
      tone={isCompleted ? "success" : "default"}
      className={`group flex h-full flex-col gap-3 break-words ${readonly ? "w-[80vw] max-w-[350px] md:w-[350px]" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <IconTile size={34}>
          <BeyouIcon id={iconId} size={18} />
        </IconTile>
        {/* Title and badges share what is left: the chips wrap to the line below
            instead of squeezing the goal's name down to three letters. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {/* Away from its parent (flat list, or the parent fell to a filter) the card
              says where it belongs; nested under the parent that line is the layout. */}
          {parentName && (
            <span className="flex w-full items-center gap-1 truncate text-[10.5px] text-text-3" title={parentName}>
              <GitBranch size={10} aria-hidden="true" />
              {t("SubGoalOf", { name: parentName })}
            </span>
          )}
          {/* Closed, the name gives way to the chips on one line; open, it is
              shown whole. A goal called "Regularizar-me em Portugal" was being
              cut to "Regularizar-me em..." with no way to read the rest. */}
          <h2
            title={title}
            className={`min-w-[7rem] flex-1 text-[15px] font-semibold leading-snug ${
              expanded ? "" : "line-clamp-1"
            } ${isCompleted ? "text-text-3" : "text-text"}`}
          >
            {title}
          </h2>

          {/* XP comes into play when the target lands; a completed goal shows
              — o que rendeu e o selo. */}
          {(targetReached || isCompleted) && (
            <Chip size="sm" variant="xp" className="shrink-0" title={t("XP Reward")}>
              +{xpReward} XP
            </Chip>
          )}
          {isCompleted && (
            <Chip size="sm" variant="ok" className="shrink-0">{t("Completed")}</Chip>
          )}
          {summary && (
            <Chip
              size="sm"
              variant={childrenDone ? "ok" : "neutral"}
              className="shrink-0"
              icon={<GitBranch size={11} aria-hidden="true" />}
              title={t("SubGoals")}
            >
              {t("SubGoalsCount", { completed: summary.completed, total: summary.total })}
            </Chip>
          )}
        </div>

        {!readonly && (
          <>
            {/* Desktop: every action on hover, there is room. Phone: only Edit stays up
                here, because five icons beside the name cut it to three letters; the
                rest waits in the fold, with its names. */}
            <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <IconButton label={t('Edit')} onClick={handleEditMode}>
                <Pencil size={15} aria-hidden="true" />
              </IconButton>
              {/* `md:contents` rather than a class on each button: IconButton already
                  sets its own display, and two display utilities on one element race. */}
              <span className="hidden md:contents">
                {canAddSubGoal && (
                  <IconButton label={t('AddSubGoal')} onClick={() => onAddSubGoal?.(id)} data-testid={`add-subgoal-${id}`}>
                    <GitBranch size={15} aria-hidden="true" />
                  </IconButton>
                )}
                {onOpenViewer && (
                  <IconButton label={t('OpenInViewer')} onClick={() => onOpenViewer(id)} data-testid={`open-viewer-${id}`}>
                    <Maximize2 size={15} aria-hidden="true" />
                  </IconButton>
                )}
                <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                  <Trash2 size={15} aria-hidden="true" />
                </IconButton>
              </span>
            </div>

            <IconButton
              label={expanded ? t('Collapse') : t('Expand')}
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </IconButton>
          </>
        )}
      </div>

      {description && (
        <p className="text-[12.5px] leading-snug text-text-3 line-clamp-2">{description}</p>
      )}

      {categoryEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categoryEntries.map(([categoryId, {name, iconId: categoryIconId}], index) => (
            <Chip key={`${categoryId}-${index}`} size="sm" icon={<BeyouIcon id={categoryIconId} size={12} />}>
              {name}
            </Chip>
          ))}
        </div>
      )}

      {/* Detail only on open: motivation, status and the full period. */}
      {expanded && (
        <div className="flex flex-col gap-2">
          {motivation && (
            <p className="text-[12.5px] italic leading-snug text-text-3">
              {t('Motivation')}: {motivation}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {statusPhrase && <Chip size="sm" variant={statusVariant}>{statusPhrase}</Chip>}
            <Chip size="sm" variant="xp" title={t('XP Reward')}>+{xpReward} XP</Chip>
          </div>
          <span className="flex items-center gap-1 font-mono text-[11px] text-text-3">
            <CalendarDays size={12} aria-hidden="true" />
            {formatDate(startDate.toString())} - {formatDate(endDate.toString())}
          </span>
          {/* Phone only: the actions the header gave up, as icon plus name. */}
          {!readonly && (
            <div className="flex flex-wrap gap-1.5 pt-1 md:hidden">
              {onOpenViewer && (
                <FoldAction label={t('OpenInViewer')} icon={<Maximize2 size={13} aria-hidden="true" />} onClick={() => onOpenViewer(id)} testId={`open-viewer-fold-${id}`} />
              )}
              {canAddSubGoal && (
                <FoldAction label={t('AddSubGoal')} icon={<GitBranch size={13} aria-hidden="true" />} onClick={() => onAddSubGoal?.(id)} testId={`add-subgoal-fold-${id}`} />
              )}
              <FoldAction label={t('Delete')} icon={<Trash2 size={13} aria-hidden="true" />} danger onClick={() => setOnDelete(true)} testId={`delete-fold-${id}`} />
            </div>
          )}
        </div>
      )}

      {/* Stepper: -/+ around the bar, with the value in mono on the right. Once the
          target is met the + gives way to Complete (that is what pays the XP); once
          completed, the same button becomes Undo. The counter opens the modal for
          a jump the +/- would take twenty presses to reach. */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <IconButton
          label={t("Decrease")}
          onClick={() => decreaseTask(id)}
          disabled={currentValue === 0}
          className="border border-border"
        >
          <Minus size={16} aria-hidden="true" />
        </IconButton>
        <XpBar className="min-w-0 flex-1" current={currentValue} target={targetValue} compact />

        {targetReached || isCompleted ? (
          <>
            {counter}
            {!readonly && (
              <Button
                text={isCompleted ? t("Undo") : t("Complete")}
                size="small"
                mode={isCompleted ? "ghost" : "primary"}
                onClick={() => completeTask(id)}
              />
            )}
          </>
        ) : (
          <>
            <IconButton
              label={t("Increase")}
              onClick={() => increaseTask(id)}
              className="border border-border"
            >
              <Plus size={16} aria-hidden="true" />
            </IconButton>
            {counter}
          </>
        )}
      </div>

      {/* The sub-goals: a thin second bar with the mean of their progress, and the list
          behind a chevron. The main bar above stays the goal's own numbers, because the
          parent is still a goal with its own target; this one says how the pieces are doing. */}
      {summary && (
        <div className="flex flex-col gap-1.5" data-testid={`subgoals-${id}`}>
          <button
            type="button"
            onClick={() => setChildrenOpen((open) => !open)}
            aria-expanded={childrenOpen}
            aria-controls={`subgoals-list-${id}`}
            className="flex items-center gap-2 rounded-control text-left transition-colors duration-200 hover:text-text"
          >
            <ChevronRight
              size={14}
              aria-hidden="true"
              className={`shrink-0 text-text-3 transition-transform duration-200 ${childrenOpen ? "rotate-90" : ""}`}
            />
            <span className="text-[11px] font-semibold text-text-3">{t("SubGoals")}</span>
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${childrenDone ? "bg-success" : "bg-accent/60"}`}
                style={{ width: `${Math.round(summary.progress * 100)}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[11px] text-text-3">{Math.round(summary.progress * 100)}%</span>
          </button>
          {childrenOpen && (
            <ul id={`subgoals-list-${id}`} className="flex flex-col rounded-control border border-border/70 bg-surface-2/40 py-1">
              {subGoals.map((child) => renderChildRow(child, 1))}
            </ul>
          )}
          {childrenDone && !isCompleted && !readonly && (
            <div
              className="flex items-center justify-between gap-2 rounded-control bg-success/10 px-2.5 py-1.5 text-[12px] text-success"
              data-testid={`subgoals-done-${id}`}
            >
              <span>{t("AllSubGoalsDone")}</span>
              <Button text={t("Complete")} size="small" mode="tonal" onClick={() => completeTask(id)} className="!h-7 !px-2.5 !text-[11px]" />
            </div>
          )}
        </div>
      )}

      {/* The at-a-glance footer: term on the left, deadline on the right. */}
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-text-3">
        <span>{termPhrase}</span>
        <span>{t("Until")} {formatDate(endDate.toString())}</span>
      </div>

      <GoalProgressModal
        isOpen={progressOpen}
        onClose={() => setProgressOpen(false)}
        name={title}
        currentValue={currentValue}
        targetValue={targetValue}
        unit={unit}
        onApply={applyProgress}
      />

      <DeleteModal
        objectId={id}
        onDelete={onDelete}
        setOnDelete={setOnDelete}
        t={t}
        name={title}
        dispatchFunction={enterGoals}
        deleteObject={deleteGoal}
        getObjects={getGoals}
        deletePhrase={
          hasSubGoals
            ? `${t("ConfirmDeleteOfGoalPhrase")} ${t("SubGoalsBecomeTopLevel", { count: subGoals.length })}`
            : t("ConfirmDeleteOfGoalPhrase")
        }
        mode="goal"
      />
    </Card>
  );
}

export default GoalBox;
