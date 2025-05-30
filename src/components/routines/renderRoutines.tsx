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
        dispatch(editModeEnter(true));
        dispatch(routineEnter(routine));
    }

    return (
        <div className="w-full flex flex-col items-center justify-center">
            {routines.length > 0 && routines.map((routine, index) => (
                <div key={index} className="flex p-4 mb-4 w-[90%] bg-white rounded-md border-[2px] border-blueMain shadow">
                    <div className="w-full flex flex-col items-start justify-center">
                        <div>
                            <h2 className="text-xl font-bold">{routine.name}</h2>
                            <p className="text-gray-500 my-1">{routine?.type === "DIARY" ? "Diary Routine" : "Diary Routine"}</p>
                        </div>
                        <div className=" flex p-1">
                            <button className={`${confirmDelete !== routine.id ? "text-[25px] text-blueMain cursor-pointer hover:text-[27px]" : "hidden"}`}
                                onClick={() => handleEdit(routine)}
                            >
                                <FaRegEdit />
                            </button>

                            <button className={`${confirmDelete !== routine.id ? "text-[25px] ml-4 text-red-600 cursor-pointer hover:text-[27px]" : "hidden"}`}
                                onClick={() => setConfirmDelete(routine.id!)}
                            >
                                <FaRegTrashAlt />
                            </button>

                            <div className={`${confirmDelete === routine.id ? "flex items-center justify-center" : "hidden"}`}>
                                <p className="text-red-600 text-lg">{t("Confirm Deletion")}</p>
                                <button className="text-red-600 ml-3"
                                    onClick={() => handleDelete(routine.id!)}>{t("Yes")}</button>
                                <button className="text-blueMain ml-6"
                                    onClick={() => setConfirmDelete("")}>{t("No")}</button>
                            </div>

                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-start cursor-pointer">
                        <p
                            className="text-[30px] text-blue-600 cursor-pointer hover:text-[32px]"
                            onClick={() => handleSchedule(routine)}
                        >
                            <FaRegClock />
                        </p>
                        <p className="mt-1">{t("Schedule")}</p>
                    </div>
                </div>

            ))}

            {routines.length === 0 && (
                <div className="w-full flex items-center justify-center p-4">
                    <p className="text-gray-800 text-center">{t("No routines available, start create some to track you tasks!")}</p>
                </div>
            )}

            {showModal && selectedRoutine && <ScheduleModal routine={selectedRoutine} onClose={() => setShowModal(false)} />}
        </div>
    )
}