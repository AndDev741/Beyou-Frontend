import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { FaRegEdit, FaRegTrashAlt, FaRegClock } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import deleteRoutine from "../../services/routine/deleteRoutine";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import { Routine } from "../../types/routine/routine";
import { editModeEnter, routineEnter } from "../../redux/routine/editRoutineSlice";
import ScheduleModal from "./ScheduleModal";

export default function RenderRoutines() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const routines = useSelector((state: RootState) => state.routines.routines) || [];
    const [confirmDelete, setConfirmDelete] = useState(""); //Will use the id to check

    const [showModal, setShowModal] = useState(false);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    const handleSchedule = (routine: Routine) => {
        setSelectedRoutine(routine);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        await deleteRoutine(id, t);

        const routines = await getRoutines(t);
        dispatch(enterRoutines(routines?.success));
    }

    const handleEdit = (routine: Routine) => {
        dispatch(routineEnter(routine));
        dispatch(editModeEnter(true));
    }

    return (
        <div className="w-full flex flex-col items-center justify-center text-secondary">
            {routines.length > 0 && routines.map((routine, index) => (
                <div key={index} className="flex p-4 mb-4 w-[90%] bg-background rounded-md border-[2px] border-primary shadow transition-colors duration-200">
                    <div className="w-full flex flex-col items-start justify-center">
                        <div>
                            <h2 className="text-xl font-bold text-secondary">{routine.name}</h2>
                            <p className="text-description my-1">{routine?.type === "DIARY" ? "Diary Routine" : "Diary Routine"}</p>
                        </div>
                        <div className=" flex p-1">
                            <button className={`${confirmDelete !== routine.id ? "text-[25px] text-primary cursor-pointer hover:text-primary/80" : "hidden"}`}
                                onClick={() => handleEdit(routine)}
                            >
                                <FaRegEdit />
                            </button>

                            <button className={`${confirmDelete !== routine.id ? "text-[25px] ml-4 text-error cursor-pointer hover:text-error/80" : "hidden"}`}
                                onClick={() => setConfirmDelete(routine.id!)}
                            >
                                <FaRegTrashAlt />
                            </button>

                            <div className={`${confirmDelete === routine.id ? "flex items-center justify-center" : "hidden"}`}>
                                <p className="text-error text-lg">{t("Confirm Deletion")}</p>
                                <button className="text-error ml-3 hover:underline"
                                    onClick={() => handleDelete(routine.id!)}>{t("Yes")}</button>
                                <button className="text-primary ml-6 hover:underline"
                                    onClick={() => setConfirmDelete("")}>{t("No")}</button>
                            </div>

                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-start cursor-pointer w-[50%]">
                        <p
                            className="text-[30px] text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200 hover:scale-105s"
                            onClick={() => handleSchedule(routine)}
                        >
                            <FaRegClock />
                        </p>
                        <p className="mt-1 text-secondary">{t("Schedule")}</p>
                        <div className="flex items-center gap-1">
                            {routine?.schedule?.days ? routine.schedule?.days?.map((day, index) => (
                                <p className="line-clamp-1 text-center text-description text-sm">
                                    {t(day)}{index === routine.schedule?.days?.length! - 1 ? "" : ", "}
                                </p>
                            )) : null}
                        </div>
                    </div>
                </div>

            ))}

            {routines.length === 0 && (
                <div className="w-full flex items-center justify-center p-4">
                    <p className="text-secondary text-center">{t("No routines available, start create some to track you tasks!")}</p>
                </div>
            )}

            {showModal && selectedRoutine && <ScheduleModal routine={selectedRoutine} onClose={() => setShowModal(false)} />}
        </div>
    )
}
