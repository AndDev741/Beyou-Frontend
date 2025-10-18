import { useTranslation } from 'react-i18next';
import AddIcon from '../../assets/addIcon.svg';
import { CgAddR } from 'react-icons/cg';

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
                group flex items-center gap-2 px-4 py-2
                bg-background border-2 border-primary rounded-md
                cursor-pointer text-xl font-medium text-secondary
                transition-all duration-200
                hover:bg-primary/10 hover:scale-105
                hover:shadow-lg
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40
            "
        >
           <CgAddR className='w-[30px] h-[30px] mr-1'/>    
            <span>{t("Create routine")}</span>
        </button>
    );
};

export default AddRoutineButton;
