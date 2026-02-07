import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import IconsBox from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editImportanceEnter, editModeEnter, editNameEnter, editOneTimeTaskEnter } from "../../redux/task/editTaskSlice";
import { RootState } from "../../redux/rootReducer";
import category from "../../types/category/categoryType";
import { task } from "../../types/tasks/taskType";
import editTask from "../../services/tasks/editTask";
import getTasks from "../../services/tasks/getTasks";
import { CgAddR } from "react-icons/cg";
import Button from "../Button";
import { toast } from "react-toastify";

function EditTask({ setTasks }: { setTasks: React.Dispatch<React.SetStateAction<task[]>> }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const taskId = useSelector((state: RootState) => state.editTask.id);
    const nameToEdit = useSelector((state: RootState) => state.editTask.name);
    const descriptionToEdit = useSelector((state: RootState) => state.editTask.description);
    const iconIdToEdit = useSelector((state: RootState) => state.editTask.iconId);
    const importanceToEdit = useSelector((state: RootState) => state.editTask.importance);
    const difficultyToEdit = useSelector((state: RootState) => state.editTask.dificulty);
    const categoriesToEdit = useSelector((state: RootState) => state.editTask.categories || [], shallowEqual);
    const oneTimeTaskToEdit = useSelector((state: RootState) => state.editTask.oneTimeTask);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [importance, setImportance] = useState(0);
    const [difficulty, setDifficulty] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState("");
    const [categoriesId, setCategoriesId] = useState<string[]>([]);
    const [alreadyChosenCategories, setAlreadyChosenCategories] = useState<category[]>([]);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [importanceError, setImportanceError] = useState("");
    const [difficultyError, setDifficultyError] = useState("");
    const [iconError, setIconError] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    const [search, setSearch] = useState("");
    const [oneTimeTask, setOneTimeTask] = useState(false);


    useEffect(() => {
        setName(nameToEdit);
        setDescription(descriptionToEdit);
        setSearch(iconIdToEdit || "");
        setSelectedIcon(iconIdToEdit);
        setImportance(importanceToEdit!);
        setDifficulty(difficultyToEdit!);

        if (categoriesToEdit.length > 0) {
            const categoriesId: string[] = [];
            for (let i = 0; i < categoriesToEdit.length; i++) {
                categoriesId.push(categoriesToEdit[i].id);
            }
            setCategoriesId(categoriesId)
        }

        setAlreadyChosenCategories(categoriesToEdit)
        setOneTimeTask(oneTimeTaskToEdit);
    }, [categoriesToEdit, descriptionToEdit, iconIdToEdit, importanceToEdit, nameToEdit, difficultyToEdit])

    const handleCancel = () => {
        dispatch(editModeEnter(false));
        dispatch(editNameEnter(""));
        dispatch(editDescriptionEnter(""));
        dispatch(editIconIdEnter(null));
        dispatch(editImportanceEnter(""));
        dispatch(editDificultyEnter(""));
        dispatch(editCaegoriesIdEnter(""));
        dispatch(editOneTimeTaskEnter(false));
    };


    const handleEdit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setImportanceError("");
        setDifficultyError("");
        setIconError("");
        setCategoriesError("");
        setUnknownError("");

        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }

        const response = await editTask(taskId, name, description, selectedIcon, importance, difficulty, categoriesId, oneTimeTask, t);

        if (response.success) {
            handleCancel();
            const newTasks = await getTasks(t);
            if (Array.isArray(newTasks.success)) {
                setTasks(newTasks.success);
            }
            toast.success(t("edited successfully"));
        }

        if (response.error) {
            setUnknownError(response.error);
            toast.error(response.error);
        }

        if (response.validation) {
            const formattedResponse = response.validation
            toast.error(formattedResponse);
            switch (formattedResponse) {
                case t('YupNameRequired'):
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
                    setUnknownError(formattedResponse);
                    break;
                default:
                    setUnknownError(t("UnkownError"));
                    break;
            }
        }
    }

    return (
        <div className="w-full bg-background text-secondary">
            <div className="flex items-center justify-center mt-5 mb-3 text-3xl">
                <CgAddR className='w-[40px] h-[40px] mr-1'/>
                <h1>{t('Edit Task')}</h1>
            </div>
            <form onSubmit={handleEdit}
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
                            minH={100}
                            placeholder={"Important to keep things organized"} />

                    </div>

                    <div className='mx-2'></div>


                    <div className='flex flex-col-reverse md:flex-col md:mt-0'>
                        <IconsBox
                            search={search}
                            setSearch={setSearch}
                            iconError={iconError}
                            selectedIcon={selectedIcon}
                            setSelectedIcon={setSelectedIcon}
                            minLgH={194}
                            minHSmallScreen={192}
                            t={t} />
                    </div>
                </div>

                <div className={`flex flex-col md:flex-row items-center justify-center w-full md:w-[65%]`}>

                        <ChooseInput
                            choosedLevel={importance}
                            setLevel={setImportance}
                            title={"Importance"}
                            levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                            error={importanceError}
                            name={"importance"}
                            t={t} 
                        />

                        <ChooseInput
                            choosedLevel={difficulty}
                            error={difficultyError}
                            setLevel={setDifficulty}
                            title={"Difficulty"}
                            levels={[t("Easy"), t("Normal"), t("Hard"),
                            t("Terrible")]}
                            name={"difficulty"}
                            t={t} 
                        />
                    </div>

                <div>
                    <ChooseCategories
                        categoriesIdList={categoriesId}
                        setCategoriesIdList={setCategoriesId}
                        errorMessage={categoriesError}
                        chosenCategories={alreadyChosenCategories} />
                     <div className="flex items-center justify-center mt-2">
                        <input
                            id="oneTimeTask"
                            type="checkbox"
                            checked={oneTimeTask}
                            onChange={(e) => setOneTimeTask(e.target.checked)}
                            className="accent-primary border border-primary w-8 h-8 rounded-xl cursor-pointer bg-background transition-colors duration-200"
                        />
                        <label htmlFor="oneTimeTask" className="ml-2 text-xl text-secondary">
                            {t('One-time Task')}
                        </label>
                    </div>
                </div>
                <p className='text-error text-lg text-center underline'>{unknownError}</p>
                <div className='flex w-full items-center justify-evenly mt-6'>
                    <div>
                        <Button text={t("Cancel")} mode='cancel' size='medium' onClick={handleCancel}/>
                    </div>
                    <div>
                        <Button text={t("Edit")} mode='create' size='medium'/>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default EditTask;
