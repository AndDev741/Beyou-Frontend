import { useTranslation } from "react-i18next";
import { useState } from "react";
import IconsBox from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import Button from "../Button";
import { task } from "../../types/tasks/taskType";
import createTask from "../../services/tasks/createTask";
import getTasks from "../../services/tasks/getTasks";
import arrowDown from "../../assets/arrowDown.svg";
import arrowUp from "../../assets/arrowUp.svg"
import { CgAddR } from "react-icons/cg";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";

function CreateTask({ setTasks }: { setTasks: React.Dispatch<React.SetStateAction<task[]>> }) {
    const { t } = useTranslation();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [importance, setImportance] = useState(0);
    const [difficulty, setDifficulty] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState("");
    const [categoriesId, setCategoriesIdList] = useState<string[]>([]);
    const [oneTimeTask, setOneTimeTask] = useState(false);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [importanceError, setImportanceError] = useState("");
    const [difficultyError, setDifficultyError] = useState("");
    const [iconError, setIconError] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

    const [search, setSearch] = useState("");

    const [expandDetails, setExpandDetails] = useState(false);
    const [expandDetailsIcon, setExpandDetailsIcon] = useState(arrowDown);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    const handleMoreDetails = () => {
        setExpandDetails(!expandDetails);
        expandDetails === true ? setExpandDetailsIcon(arrowDown) : setExpandDetailsIcon(arrowUp);
    }

    const handleCreateTask = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setImportanceError("");
        setDifficultyError("");
        setIconError("");
        setCategoriesError("");
        setApiError(null);

        const response = await createTask(name, description, selectedIcon, categoriesId, t, importance, difficulty, oneTimeTask);

        if (response?.success) {
            const newTasks = await getTasks(t);
            if (Array.isArray(newTasks.success)) {
                setTasks(newTasks.success);
            }
            setName("");
            setDescription("");
            setImportance(0);
            setDifficulty(0);
            setSelectedIcon("");
            setCategoriesIdList([]);
            setOneTimeTask(false);
            toast.success(t("created successfully"));
        }

        if (response?.error) {
            setApiError(response.error);
            toast.error(getFriendlyErrorMessage(t, response.error));
        }

        if (response?.validation) {
            const formattedResponse = response.validation
            toast.error(formattedResponse);
            switch (formattedResponse) {
                case t('YupNameRequired') || t('YupMinimumName') || t('YupMaxName'):
                    setNameError(formattedResponse);
                    scrollToTop();
                    break;
                case t('YupMinimumName'):
                    setNameError(formattedResponse);
                    scrollToTop();
                    break;
                case t('YupMaxName'):
                    setNameError(formattedResponse);
                    scrollToTop();
                    break;
                case t('YupDescriptionMaxValue'):
                    setDescriptionError(formattedResponse);
                    scrollToTop();
                    break;
                case t('YupIconRequired'):
                    setIconError(formattedResponse);
                    break;
                case t("Importance and Difficulty must be set together"):
                    setApiError({ message: formattedResponse });
                    break;
                default:
                    setApiError({ message: t("UnkownError") });
                    break;
            }
        }
    }

    return (
        <div className="w-full bg-background text-secondary">
            <div className="flex items-center justify-center mt-5 mb-3 text-3xl text-secondary">
                <CgAddR className='w-[40px] h-[40px] mr-1'/>
                <h1>{t('Create Task')}</h1>
            </div>
            <form onSubmit={handleCreateTask}
                className="flex flex-col items-center">
                <div className='flex md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start md:justify-start'>
                        <GenericInput
                            name='Name'
                            data={name}
                            placeholder={"Clean the house"}
                            setData={setName}
                            dataError={nameError}
                            t={t} />


                        <DescriptionInput t={t}
                            description={description}
                            setDescription={setDescription}
                            descriptionError={descriptionError}
                            placeholder={"Important to keep things organized"}
                            minH={0} />

                    </div>

                    <div className='mx-2'></div>

                    <div className='flex flex-col mt-1'>
                        <IconsBox
                            search={search}
                            setSearch={setSearch}
                            iconError={iconError}
                            selectedIcon={selectedIcon}
                            setSelectedIcon={setSelectedIcon}
                            t={t}
                            minLgH={158} />

                    </div>
                </div>

                <div className="flex items-center text-2xl font-medium mt-5 cursor-pointer text-secondary transition-colors duration-200 hover:text-primary"
                    onClick={handleMoreDetails}>
                    <img src={expandDetailsIcon}
                        className="w-[40px]" />
                    More Details
                </div>

                <div className={`flex flex-col md:flex-row items-center justify-center w-full md:w-[80%]
                    ${expandDetails ? "" : "hidden"}`}>
                    <ChooseInput
                        choosedLevel={importance}
                        setLevel={setImportance}
                        title={"Importance"}
                        levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                        error={importanceError}
                        name={"importance"}
                        t={t} />


                    <ChooseInput
                        choosedLevel={difficulty}
                        error={difficultyError}
                        setLevel={setDifficulty}
                        title={"Difficulty"}
                        levels={[t("Easy"), t("Normal"), t("Hard"),
                        t("Terrible")]}
                        name={"Difficulty"}
                        t={t} />
                </div>
                <div className={`${expandDetails ? "md:w-[80%]" : "hidden"}`}>
                    <ChooseCategories
                        categoriesIdList={categoriesId}
                        setCategoriesIdList={setCategoriesIdList}
                        errorMessage={categoriesError}
                        chosenCategories={null} />
                    <div className="flex items-center justify-center mt-2">
                        <input
                            id="oneTimeTask"
                            type="checkbox"
                            checked={oneTimeTask}
                            onChange={(e) => setOneTimeTask(e.target.checked)}
                            className="accent-primary border border-primary w-8 h-8 rounded-xl cursor-pointer bg-background transition-colors duration-200"
                        />
                        <label htmlFor="oneTimeTask" className="ml-2 text-xl text-secondary">
                            {t('One Time Task')}
                        </label>
                    </div>
                </div>
                <ErrorNotice error={apiError} className="text-center" />
                <div className="mb-3 mt-3">
                    <Button text={t("Create")} mode='create' size='big'/>
                </div>
            </form>
        </div>
    )
}

export default CreateTask;
