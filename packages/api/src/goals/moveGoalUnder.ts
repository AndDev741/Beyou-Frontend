import { TFunction } from "i18next";
import type { goal } from "@beyou/types/goals/goalType";
import editGoal from "./editGoal";

/** The form's ISO day for a goal date that may arrive as a Date or a string. */
const toIsoDay = (value: Date | string | null | undefined): string => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Re-parent a goal and change nothing else.
 *
 * There is no dedicated endpoint for the clients (the agent has a tool); PUT /goal takes
 * the whole record, so every field is echoed from the row as it is and only `parentId`
 * moves. The server still runs the tree rules (owner, cycle, three levels), so a
 * refusal comes back as the usual keyed error.
 */
const moveGoalUnder = (item: goal, parentId: string | null, t: TFunction) =>
  editGoal(
    item.id,
    item.name,
    item.iconId,
    item.description ?? "",
    item.targetValue,
    item.unit,
    item.currentValue,
    item.complete,
    Object.keys(item.categories ?? {}),
    item.motivation ?? "",
    toIsoDay(item.startDate),
    toIsoDay(item.endDate),
    item.status,
    item.term,
    t,
    parentId
  );

export default moveGoalUnder;
