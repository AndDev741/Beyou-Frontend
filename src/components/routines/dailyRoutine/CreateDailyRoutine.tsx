import { useEffect, useState } from "react";
import AddIcon from '../../../assets/addIcon.svg';
import { useTranslation } from "react-i18next";
import CreateRoutineSection from "./CreateRoutineSection";
import { RoutineSection } from "../../../types/routine/routineSection";
import { IconObject } from "../../../types/icons/IconObject";
import SectionItem from "./SectionItem";
import Button from "../../Button";
import { Routine } from "../../../types/routine/routine";

type CreateDailyRoutineProps = {}

const CreateDailyRoutine = ({}: CreateDailyRoutineProps) => {
    const { t } = useTranslation();
    const [routineName, setRoutineName] = useState<string>("");
    const [routineSection, setRoutineSection] = useState<RoutineSection[]>([]);
    console.log("routineSection", routineSection);
    const [showModal, setShowModal] = useState(false);

    const [editIndex, setEditIndex] = useState<number | null>(null);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setShowModal(false);
            setEditIndex(null);
        }
    };

    const handleDeleteSection = (index: number) => {
        setRoutineSection(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditSection = (index: number) => {
        setEditIndex(index);
        setShowModal(true);
    };

    const handleUpdateSection = (updatedSection: RoutineSection) => {
        console.log("updatedSection", updatedSection);
        if (editIndex !== null) {
            setRoutineSection(prev =>
                prev.map((section, idx) => (idx === editIndex ? updatedSection : section))
            );
            setEditIndex(null);
            setShowModal(false);
        }
    };

    const handleCreate = async () => {
        const routine: Routine = {
            name: routineName,
            iconId: "",
            routineSections: routineSection
        }

        console.log(routine)
    }

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <h2 className='text-2xl'>{t("Creating daily routine")}</h2>

            <div className="relative w-[95%] flex flex-col items-center justify-start border-2 border-blueMain rounded-lg p-3 mt-4 bg-white shadow-sm min-h-[400px]">

                <input
                    type="text"
                    value={routineName}
                    onChange={e => setRoutineName(e.target.value)}
                    className="mb-6 w-[65%] px-4 py-2 border-0 border-b-2 border-b-blueMain rounded-none text-2xl font-semibold text-center focus:outline-none"
                    placeholder={t("Routine name")}
                />

                <button
                    className="absolute top-3 right-3 flex flex-col items-center"
                    onClick={() => { setShowModal(true); setEditIndex(null); }}
                >
                    <img
                        src={AddIcon}
                        alt={t('Routines icon alt')}
                        className="w-8 h-8"
                    />
                    <span className='text-sm text-center font-medium mt-1 whitespace-pre-line'>
                        {t("add period")}
                    </span>
                </button>

                <div className="w-full flex flex-col items-center justify-start mt-5">
                    {routineSection.length > 0 ? (
                        routineSection.map((section, index) => (
                            <SectionItem
                                key={index}
                                section={section}
                                onEdit={() => handleEditSection(index)}
                                onDelete={() => handleDeleteSection(index)}
                                setRoutineSection={setRoutineSection}
                                index={index}
                            />
                        ))
                    ) : (
                        <p className="text-gray-500">{t("No sections added")}</p>
                    )}
                </div>
            </div>

            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    onClick={handleOverlayClick}
                >
                    <div className="bg-white rounded-lg shadow-lg p-8 min-w-[350px] max-w-lg w-[93%] relative" onClick={e => e.stopPropagation()}>
                        <CreateRoutineSection
                            setRoutineSection={editIndex === null ? setRoutineSection : (updatedSections => {
                                if (updatedSections.length > routineSection.length) {
                                    setRoutineSection(updatedSections);
                                } else if (editIndex !== null) {
                                    handleUpdateSection(updatedSections[editIndex]);
                                }
                            })}
                            onClose={() => { setShowModal(false); setEditIndex(null); }}
                            onUpdateSection={handleUpdateSection}
                            editIndex={editIndex}
                            editSection={editIndex !== null ? routineSection[editIndex] : undefined}
                        />
                    </div>
                </div>
            )}
            <div className="my-2 mb-6"
            onClick={handleCreate}
            >
                <Button text={t('create')} />
            </div>
           
        </div>
    )
}

export default CreateDailyRoutine;