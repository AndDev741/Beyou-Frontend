import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { goal as GoalType } from "@beyou/types/goals/goalType";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import DeleteModal from "../DeleteModal";
import getGoals from "@beyou/api/goals/getGoals";
import deleteGoal from "@beyou/api/goals/deleteGoal";
import { CalendarDays, ChevronDown, ChevronUp, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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
};

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
}: GoalBoxProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [onDelete, setOnDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [termPhrase, setTermPhrase] = useState("");
  const [statusPhrase, setStatusPhrase] = useState("");
  const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

  // "Concluir" é quem paga o XP, então só aparece com o alvo batido; antes
  // dele o cartão mostra o + do stepper. targetValue 0 nunca "chega ao alvo".
  const targetReached = targetValue > 0 && currentValue >= targetValue;
  const statusVariant: ChipVariant =
    status === "COMPLETED" ? "ok" : status === "IN_PROGRESS" ? "accent" : "neutral";
  const categoryEntries = Object.entries(categories ?? {});

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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short", // "Jan", "Feb", "Mar"...
      day: "numeric"  // 1, 2, 3...
    });
  }

  const completeTask = async (id: string) => {
    const refreshUi = await markGoalAsComplete(id, t);
    if(refreshUi?.success){
      setRefreshUi(refreshUi.success);
    }

    const goals = await getGoals(t);
    dispatch(enterGoals(goals.success));
  }

  const increaseTask = async (id: string) => {
    const goal = await increaseCurrentValue(id, t);
    mountGoalWithNewValues(goal);
  }

  const decreaseTask = async (id: string) => {
    const goal = await decreaseCurrentValue(id, t);
    mountGoalWithNewValues(goal);
  }

  const mountGoalWithNewValues = (goal: GoalType) => {
    dispatch(updateGoal(goal));
  }

  const isCompleted = status === "COMPLETED";

  return (
    <Card
      interactive
      tone={isCompleted ? "success" : "default"}
      className={`group flex h-full flex-col gap-3 break-words ${readonly ? "w-[80vw] max-w-[350px] md:w-[350px]" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <IconTile size={34}>
          <BeyouIcon id={iconId} size={18} />
        </IconTile>
        <h2
          className={`min-w-0 flex-1 text-[15px] font-semibold leading-snug line-clamp-1 ${
            isCompleted ? "text-text-3" : "text-text"
          }`}
        >
          {title}
        </h2>

        {/* A meta concluída é troféu: o chip de XP no lugar do stepper. */}
        {isCompleted && (
          <Chip size="sm" variant="ok" className="shrink-0">{t("Completed")}</Chip>
        )}
        {!isCompleted && targetReached && (
          <Chip size="sm" variant="xp" className="shrink-0" title={t("XP Reward")}>
            +{xpReward} XP
          </Chip>
        )}

        {!readonly && (
          <>
            {/* Editar e excluir no hover do desktop, sempre visíveis no telefone. */}
            <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <IconButton label={t('Edit')} onClick={handleEditMode}>
                <Pencil size={15} aria-hidden="true" />
              </IconButton>
              <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                <Trash2 size={15} aria-hidden="true" />
              </IconButton>
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

      {description && !isCompleted && (
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

      {/* O detalhe só ao abrir: motivação, status e o período completo. */}
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
        </div>
      )}

      {/* Stepper: -/+ em volta da barra, com o valor em mono à direita.
          Concluída, ele dá lugar ao Desfazer — o progresso já foi pago. */}
      {isCompleted ? (
        <div className="mt-auto flex justify-end pt-1">
          {!readonly && (
            <Button
              text={t("Undo")}
              size="small"
              mode="ghost"
              onClick={() => completeTask(id)}
            />
          )}
        </div>
      ) : (
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
          {/* Só sobra o + enquanto o alvo não chegou; batido, o espaço é do
              Concluir, que é quem paga o XP. */}
          {targetReached ? (
            <>
              <span className="shrink-0 font-mono text-xs font-semibold text-text-2">
                {currentValue}/{targetValue} {unit}
              </span>
              <Button
                text={t("Complete")}
                size="small"
                mode="primary"
                onClick={() => completeTask(id)}
              />
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
              <span className="shrink-0 font-mono text-xs font-semibold text-text-2">
                {currentValue}/{targetValue} {unit}
              </span>
            </>
          )}
        </div>
      )}

      {/* O rodapé de relance: prazo à esquerda, data-limite à direita. */}
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-text-3">
        <span>{isCompleted ? formatDate(endDate.toString()) : termPhrase}</span>
        <span>
          {isCompleted
            ? t("GoalXpEarned", { xp: xpReward })
            : `${t("Until")} ${formatDate(endDate.toString())}`}
        </span>
      </div>

      <DeleteModal
        objectId={id}
        onDelete={onDelete}
        setOnDelete={setOnDelete}
        t={t}
        name={title}
        dispatchFunction={enterGoals}
        deleteObject={deleteGoal}
        getObjects={getGoals}
        deletePhrase={t("ConfirmDeleteOfGoalPhrase")}
        mode="goal"
      />
    </Card>
  );
}

export default GoalBox;
