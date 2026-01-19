import { TFunction } from "i18next";
import { useSelector } from "react-redux";
import { RootState } from "../redux/rootReducer";
import { useDispatch } from "react-redux";
import { editModeEnter as editCategoryMode } from "../redux/category/editCategorySlice";
import { editModeEnter as editHabitMode } from "../redux/habit/editHabitSlice";
import { editIdEnter as editTaskMode } from "../redux/task/editTaskSlice";
import { editModeEnter as editGoalMode } from "../redux/goal/editGoalSlice";


type deleteProps = {
    objectId: string, 
    onDelete: boolean, 
    setOnDelete: React.Dispatch<React.SetStateAction<boolean>>
    t: TFunction, 
    name: string,
    setObjects: any,
    deleteObject: any,
    getObjects: any,
    deletePhrase: string,
    mode: "category" | "habit" | "task" | "goal";
    dispatchFunction?: any
}

function DeleteModal({objectId, onDelete, setOnDelete, t, name, setObjects, deleteObject, getObjects, deletePhrase, mode, dispatchFunction}: deleteProps){
    const dispatch = useDispatch();
    const categoryIdInEdit = useSelector((state: RootState) => state.editCategory.id);
    const habitIdInEdit = useSelector((state: RootState) => state.editHabit.id);
    const taskIdInEdit = useSelector((state: RootState) => state.editTask.id);
    const goalIdInEdit = useSelector((state: RootState) => state.editGoal.goalId);

    if(!onDelete) return null;
    
    const handleDelete = async () => {
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
                console.log("No mode found");
        }

        if(response.success){
           const newObjects = await getObjects(t);
           if(Array.isArray(newObjects.success)){

            if(setObjects){
                setObjects(newObjects.success);
            }

            if(dispatchFunction){
                dispatch(dispatchFunction(newObjects.success))
            }
           }
        }
    }
    return(
        <div className={`${onDelete ? "flex" : "hidden"} flex-col items-center justify-center absolute top-0 left-0 h-[100%] w-[100%] bg-background rounded-md text-secondary border border-primary/20`}>
            <h1 className="text-center font-semibold">{deletePhrase}</h1>
            <h2 className="underline my-3 text-description">{name}</h2>
            <div className="flex lg:flex-row flex-col items-center">
                <button onClick={handleDelete}
                className="bg-error hover:bg-error/90 lg:mr-1 text-white font-semibold w-[100px] h-[32px] rounded-md transition-colors duration-200">
                    {t('Delete')}
                </button>
                <button onClick={() => setOnDelete(false)}
                className="bg-secondary/10 hover:bg-secondary/20 mt-1 lg:mt-0 lg:ml-1 text-secondary font-semibold w-[100px] h-[32px] rounded-md transition-colors duration-200">
                    {t('Cancel')}
                </button>
            </div>
        </div>
    )
}

export default DeleteModal;
