import { useTranslation } from 'react-i18next';
import AddIcon from '../../assets/addIcon.svg';

type addRoutineButtonProps = {
    setOnCreateRoutine: (value: boolean) => void;
    setRoutineType: (value: string) => void;
};

const AddRoutineButton = ({setOnCreateRoutine, setRoutineType}: addRoutineButtonProps) => {
    const { t } = useTranslation();

    const handleClick = () => {
        setOnCreateRoutine(true);
        setRoutineType("");
    }

    return (
        <button
        onClick={handleClick}
            type="button"
            className="
                flex items-center gap-2 px-4 py-2
                bg-white border-2 border-[#0082E1] rounded-md
                cursor-pointer text-xl font-medium
                transition-all duration-200
                hover:bg-[#f0f8ff] hover:scale-105
                hover:shadow-lg
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0082E1]
            "
        >
            <img src={AddIcon} alt="Add" className="w-8 h-8 transition-transform duration-200 group-hover:rotate-12" />
            <span>{t("Create routine")}</span>
        </button>
    );
};

export default AddRoutineButton;