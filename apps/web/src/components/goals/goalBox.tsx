import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { goal as GoalType } from "@beyou/types/goals/goalType";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import DeleteModal from "../DeleteModal";
import getGoals from "@beyou/api/goals/getGoals";
import deleteGoal from "@beyou/api/goals/deleteGoal";
import { CalendarDays, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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
import Ring from "../../ui/Ring";
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
  const [termPhrase, setTermPhrase] = useState("");
  const [statusPhrase, setStatusPhrase] = useState("");
  const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

  // targetValue 0 dividiria por zero — o cartão mostra 0% em vez de NaN%.
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  // "Concluir" é quem paga o XP, então só aparece com o alvo batido. A meta já
  // marcada como concluída mantém o botão para poder ser desmarcada.
  const targetReached = targetValue > 0 && currentValue >= targetValue;
  const showCompleteAction = targetReached || status === "COMPLETED";
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

  return (
    <Card
      interactive
      tone={status === "COMPLETED" ? "success" : "default"}
      className={`flex h-full flex-col gap-3 break-words ${readonly ? "w-[80vw] max-w-[350px] md:w-[350px]" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <IconTile size={38}>
          <BeyouIcon id={iconId} size={20} />
        </IconTile>
        <h2 className="min-w-0 flex-1 pt-1 text-base font-semibold leading-snug text-text line-clamp-1">{title}</h2>
        <Ring
          size={44}
          state="progress"
          progress={progress / 100}
          label={`${Math.round(progress)}%`}
          title={t('Progress')}
        />
      </div>

      {/* A descrição fica no cartão em duas linhas — nunca some. */}
      <p className="text-sm leading-snug text-text-2 line-clamp-2">{description}</p>

      {motivation && (
        <p className="text-sm italic leading-snug text-text-3 line-clamp-2">
          {t('Motivation')}: {motivation}
        </p>
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

      {/* Stepper: -/+ em volta da barra, com o valor em mono à direita. */}
      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Sem chave i18n para "diminuir/aumentar": o nome acessível continua
              sendo o glifo, exatamente como no stepper antigo. */}
          <IconButton
            label="-"
            onClick={() => decreaseTask(id)}
            disabled={currentValue === 0}
            className="border border-border"
          >
            <Minus size={16} aria-hidden="true" />
          </IconButton>
          <XpBar className="min-w-0 flex-1" current={currentValue} target={targetValue} compact />
          <IconButton
            label="+"
            onClick={() => increaseTask(id)}
            className="border border-border"
          >
            <Plus size={16} aria-hidden="true" />
          </IconButton>
          <span className="shrink-0 font-mono text-xs font-semibold text-text-2">
            {currentValue}/{targetValue} {unit}
          </span>
        </div>

        {showCompleteAction && (
          <Button
            text={status === "COMPLETED" ? t("Remove Complete") : t("Mark Complete")}
            size="small"
            mode="primary"
            onClick={() => completeTask(id)}
            disabled={currentValue === 0}
            className="w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {termPhrase && <Chip size="sm">{termPhrase}</Chip>}
          {statusPhrase && <Chip size="sm" variant={statusVariant}>{statusPhrase}</Chip>}
        </div>
        <span className="flex items-center gap-1 font-mono text-xs text-text-3">
          <CalendarDays size={12} aria-hidden="true" />
          {formatDate(startDate.toString())} - {formatDate(endDate.toString())}
        </span>
      </div>

      {!readonly && (
        <div className="flex justify-end gap-1 border-t border-border pt-2">
          <IconButton label={t('Edit')} onClick={handleEditMode}>
            <Pencil size={16} aria-hidden="true" />
          </IconButton>
          <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
            <Trash2 size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}

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
