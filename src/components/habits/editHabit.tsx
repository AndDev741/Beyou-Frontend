import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import habitIcon from '../../assets/dashboard/shortcuts/habits.svg'
import IconsBox from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editImportanceEnter, editModeEnter, editMotivationalPhraseEnter, editNameEnter } from "../../redux/habit/editHabitSlice";
import editHabit from "../../services/habits/editHabit";
import { RootState } from "../../redux/rootReducer";
import category from "../../types/category/categoryType";
import { habit } from "../../types/habit/habitType";
import getHabits from "../../services/habits/getHabits";
import { CgAddR } from "react-icons/cg";

function EditHabit({setHabits}: {setHabits: React.Dispatch<React.SetStateAction<habit[]>>}){
    const {t} = useTranslation();
    const dispatch = useDispatch();

    const habitId = useSelector((state: RootState) => state.editHabit.id);
    const nameToEdit = useSelector((state: RootState) => state.editHabit.name);
    const descriptionToEdit = useSelector((state: RootState) => state.editHabit.description);
    const motivationalPhraseToEdit = useSelector((state: RootState) => state.editHabit.motivationalPhrase);
    const iconIdToEdit = useSelector((state: RootState) => state.editHabit.iconId);
    const importanceToEdit = useSelector((state: RootState) => state.editHabit.importance);
    const dificultyToEdit = useSelector((state: RootState) => state.editHabit.dificulty);
    const categoriesToEdit = useSelector((state: RootState) => state.editHabit.categories || [], shallowEqual) ;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [motivationalPhrase, setMotivationalPhrase] = useState("");
    const [importance, setImportance] = useState(1);
    const [dificulty, setDificulty] = useState(1);
    const [selectedIcon, setSelectedIcon] = useState("");
    const [categoriesId, setCategoriesId] = useState<string[]>([]);
    const [alreadyChosenCategories, setAlreadyChosenCategories] = useState<category[]>([]);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [motivationalPhraseError, setMotivationalPhraseError] = useState("");
    const [importanceError, setImportanceError] = useState("");
    const [dificultyError, setDificultyError] = useState("");
    const [iconError, setIconError] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    const [search, setSearch] = useState("");
    useEffect(() => {
        setName(nameToEdit);
        setDescription(descriptionToEdit);
        setMotivationalPhrase(motivationalPhraseToEdit);
        setSearch(iconIdToEdit ||  "");
        setSelectedIcon(iconIdToEdit);
        setImportance(importanceToEdit);
        setDificulty(dificultyToEdit);

        if(categoriesToEdit.length > 0){
            const categoriesId: string[] = [];
            for(let i = 0; i < categoriesToEdit.length; i++){
                categoriesId.push(categoriesToEdit[i].id);
            }
            setCategoriesId(categoriesId)
        }
        
        setAlreadyChosenCategories(categoriesToEdit)
    }, [categoriesToEdit, descriptionToEdit, iconIdToEdit, importanceToEdit, motivationalPhraseToEdit, nameToEdit, dificultyToEdit])

    const handleCancel = () => {
        dispatch(editModeEnter(false));
        dispatch(editNameEnter(""));
        dispatch(editDescriptionEnter(""));
        dispatch(editMotivationalPhraseEnter(""));
        dispatch(editIconIdEnter(null));
        dispatch(editImportanceEnter(""));
        dispatch(editDificultyEnter(""));
        dispatch(editCaegoriesIdEnter(""));
    };


    const handleEdit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setMotivationalPhraseError("");
        setImportanceError("");
        setDificultyError("");
        setIconError("");
        setCategoriesError("");
        setUnknownError("");

        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }

        const response = await editHabit(habitId, name, description, motivationalPhrase, selectedIcon, importance, dificulty, categoriesId, t);

        if(response.success){
            handleCancel();
            const newHabits = await getHabits(t);
            if(Array.isArray(newHabits.success)){
                setHabits(newHabits.success);
            }
        }

        if(response.validation){
            const formattedResponse = response.validation
            switch(formattedResponse){
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
                case t("YupGenericMaxLength"):
                    setMotivationalPhraseError(formattedResponse);
                    scrollToTop();
                    break;
                case t("YupImportanceRequired"):
                    setImportanceError(formattedResponse);
                    scrollToTop();
                    break;
                case t("YupDificultyRequired"):
                    setDificultyError(formattedResponse);
                    break;
                case t('YupIconRequired'):
                    setIconError(formattedResponse);
                    break;
                case t("YupRequiredCategories"):
                    setCategoriesError(formattedResponse);
                    break;
                default:
                    setUnknownError(t("UnkownError"));
                    break;
            }
        }
    }

    return(
        <div className="bg-background">
            <div className="flex text-3xl items-center justify-center mt-5 mb-3"> 
                <CgAddR className='w-[40px] h-[40px] mr-1'/>
                <h1>{t('EditHabit')}</h1>
            </div>
            <form onSubmit={handleEdit} 
            className="flex flex-col items-center">
                <div className='flex md:items-start md:flex-row justify-center'>
                 <div className='flex flex-col md:items-start md:justify-start'>
                    <GenericInput 
                        name='Name'
                        data={name} 
                        placeholder={"CategoryNamePlaceholder"}
                        setData={setName} 
                        dataError={nameError}
                        t={t} />

                        <DescriptionInput t={t}
                        description={description}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        minH={75}
                        placeholder={"HabitDescriptionPlaceholder"}/>

                        <GenericInput
                        t={t}
                        data={motivationalPhrase}
                        setData={setMotivationalPhrase}
                        dataError={motivationalPhraseError}
                        placeholder={"MotivationalPhrasePlaceholder"}
                        name={"MotivationPhrase"} />

                      
                    </div>

                    <div className='mx-2'></div>

                    <div className='flex flex-col md:flex-col md:mt-0'>
                        <IconsBox 
                        search={search}
                        setSearch={setSearch}
                        iconError={iconError}
                        selectedIcon={selectedIcon}
                        setSelectedIcon={setSelectedIcon}
                        minLgH={255}
                        minHSmallScreen={262}
                        t={t}/>    
                    </div>
                    
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center w-full md:w-[80%] ">
                        <ChooseInput
                            choosedLevel={dificulty}
                            error={dificultyError}
                            setLevel={setDificulty}
                            title={"Dificulty"}
                            levels={[t("Easy"), t("Normal"), t("Hard"), 
                            t("Terrible")]}
                            name={"dificulty"}
                            t={t} 
                        />        
                        <ChooseInput
                            choosedLevel={importance}
                            setLevel={setImportance}
                            title={"Importance"}
                            levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                            error={importanceError}
                            name={"importance"}
                            t={t} 
                        />
                    </div>
                    
                <div>
                    <ChooseCategories
                    categoriesIdList={categoriesId}
                    setCategoriesIdList={setCategoriesId}
                    errorMessage={categoriesError}
                    chosenCategories={alreadyChosenCategories}/>
                </div>
                <p className='text-error text-lg text-center'>{unknownError}</p>
                <div className='flex w-full items-center justify-evenly my-6'>
                    <div>
                        <button type='button'
                        onClick={handleCancel}
                        className='w-[120px] md:w-[200px] h-[45px] rounded-[20px] text-lg lg:text-2xl font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border-primary border-[1px]'>
                            {t('Cancel')}
                        </button>
                    </div>
                    <div>
                        <button 
                        className='w-[120px] md:w-[200px] h-[45px] bg-primary rounded-[20px] text-white text-lg lg:text-2xl font-semibold hover:bg-primary/90 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105'>
                            {t('Edit')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default EditHabit;









