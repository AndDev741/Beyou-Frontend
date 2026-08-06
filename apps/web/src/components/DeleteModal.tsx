import { TFunction } from "i18next";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { useDispatch } from "react-redux";
import { UnknownAction } from "@reduxjs/toolkit";
import { editModeEnter as editCategoryMode } from "@beyou/state/category/editCategorySlice";
import { editModeEnter as editHabitMode } from "@beyou/state/habit/editHabitSlice";
import { editIdEnter as editTaskMode } from "@beyou/state/task/editTaskSlice";
import { editModeEnter as editGoalMode } from "@beyou/state/goal/editGoalSlice";
import { toast } from "react-toastify";
import { useEffect, useId, useState } from "react";
import ErrorNotice from "./ErrorNotice";
import Button from "./Button";
import Modal from "./modals/Modal";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";

/** Shape every delete service (deleteCategory/Habit/Task/Goal) returns. */
type DeleteResponse = { success?: unknown; error?: ApiErrorPayload };

type DeleteModalProps<T> = {
    objectId: string;
    onDelete: boolean;
    setOnDelete: React.Dispatch<React.SetStateAction<boolean>>;
    t: TFunction;
    name: string;
    /** Local-state updater for pages that keep the list in useState. */
    setObjects?: ((items: T[]) => void) | null;
    deleteObject: (id: string, t: TFunction) => Promise<DeleteResponse>;
    /** Re-fetches the list after a delete; services return loose records whose
     *  `success` carries the refreshed array. */
    getObjects: (t: TFunction) => Promise<Record<string, unknown>>;
    deletePhrase: string;
    mode: "category" | "habit" | "task" | "goal" | "routine";
    /** Redux action creator for pages that keep the list in the store. */
    dispatchFunction?: (items: T[]) => UnknownAction;
};

function DeleteModal<T>({objectId, onDelete, setOnDelete, t, name, setObjects, deleteObject, getObjects, deletePhrase, mode, dispatchFunction}: DeleteModalProps<T>){
    const dispatch = useDispatch();
    const categoryIdInEdit = useSelector((state: RootState) => state.editCategory.id);
    const habitIdInEdit = useSelector((state: RootState) => state.editHabit.id);
    const taskIdInEdit = useSelector((state: RootState) => state.editTask.id);
    const goalIdInEdit = useSelector((state: RootState) => state.editGoal.goalId);
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const titleId = useId();

    useEffect(() => {
        if (onDelete) {
            setApiError(null);
        }
    }, [onDelete]);

    if(!onDelete) return null;

    const handleClose = () => {
        setApiError(null);
        setOnDelete(false);
    };

    const handleDelete = async () => {
        setApiError(null);
        const response = await deleteObject(objectId, t);

        switch(mode){
            case "category":
                if(categoryIdInEdit === objectId){
                    dispatch(editCategoryMode(false));
                }
                break;
            case "habit":
                if(habitIdInEdit === objectId){
                    dispatch(editHabitMode(false));
                }
                break;
            case "task":
                if(taskIdInEdit === objectId){
                    dispatch(editTaskMode(false));
                }
                break;
            case "goal":
                if(goalIdInEdit === objectId){
                    dispatch(editGoalMode(false));
                }
                break
            default:
                break;
        }

        if(response.success){
           const newObjects = await getObjects(t);
           const refreshed = newObjects.success;
           if(Array.isArray(refreshed)){
            if(setObjects){
                setObjects(refreshed as T[]);
            }
            if(dispatchFunction){
                dispatch(dispatchFunction(refreshed as T[]));
            }
           }
           toast.success(t('deleted successfully'));
           setOnDelete(false);
        } else if (response.error) {
            setApiError(response.error);
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    }

    return(
        // O desenho do mockup: pergunta como título à esquerda, o item entre
        // aspas no corpo e as ações à direita — Cancelar (ghost) antes de
        // Excluir (destrutivo), que é a última e mais forte.
        <Modal isOpen={onDelete} onClose={handleClose} labelledBy={titleId} className="max-w-md">
            <div className="text-text">
                <h1 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {deletePhrase}
                </h1>
                <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                    {t("DeleteWillRemove", { name })}
                </p>

                <div className="mt-4 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={handleClose} />
                    <Button text={t("Delete")} mode="danger" size="medium" type="button" onClick={handleDelete} />
                </div>
                <ErrorNotice error={apiError} className="mt-2" />
            </div>
        </Modal>
    )
}

export default DeleteModal;
