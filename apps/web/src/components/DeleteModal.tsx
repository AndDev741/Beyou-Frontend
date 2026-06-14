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
import Modal from "./modals/Modal";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../services/apiError";

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
    mode: "category" | "habit" | "task" | "goal";
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
        <Modal isOpen={onDelete} onClose={handleClose} labelledBy={titleId} className="max-w-md">
            <div className="flex flex-col items-center justify-center text-secondary">
                <h1 id={titleId} className="text-center font-semibold">{deletePhrase}</h1>
                <h2 className="underline my-3 text-description">{name}</h2>
                <div className="flex lg:flex-row flex-col items-center">
                    <button onClick={handleDelete}
                    className="bg-error hover:bg-error/90 lg:mr-1 text-white font-semibold w-[100px] h-[32px] rounded-md transition-colors duration-200">
                        {t('Delete')}
                    </button>
                    <button onClick={handleClose}
                    className="bg-secondary/10 hover:bg-secondary/20 mt-1 lg:mt-0 lg:ml-1 text-secondary font-semibold w-[100px] h-[32px] rounded-md transition-colors duration-200">
                        {t('Cancel')}
                    </button>
                </div>
                <ErrorNotice error={apiError} className="mt-2 text-center" />
            </div>
        </Modal>
    )
}

export default DeleteModal;
