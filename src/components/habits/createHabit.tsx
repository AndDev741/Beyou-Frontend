import { useTranslation } from "react-i18next";
import { useState } from "react";
import habitIcon from '../../assets/dashboard/shortcuts/habits.svg'
import IconsBox from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import Button from "../Button";
import ExperienceInput from "../inputs/experienceInput";
import createHabit from "../../services/habits/createHabit";
import { habit } from "../../types/habit/habitType";
import getHabits from "../../services/habits/getHabits";
import { CgAddR } from "react-icons/cg";

function CreateHabit({setHabits}: {setHabits: React.Dispatch<React.SetStateAction<habit[]>>}){
    const {t} = useTranslation();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [motivationalPhrase, setMotivationalPhrase] = useState("");
    const [importance, setImportance] = useState(0);
    const [difficulty, setDifficulty] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState("");
    const [experience, setExperience] = useState(0);
    const [categoriesId, setCategoriesIdList] = useState<string[]>([]);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [motivationalPhraseError, setMotivationalPhraseError] = useState("");
    const [importanceError, setImportanceError] = useState("");
    const [difficultyError, setDifficultyError] = useState("");
    const [iconError, setIconError] = useState("");
    const [experienceError, setExperienceError] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [unknownError, setUnknownError] = useState("");
    
    const [search, setSearch] = useState("");

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    const handleCreateHabit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setMotivationalPhraseError("");
        setImportanceError("");
        setDifficultyError("");
        setIconError("");
        setExperienceError("");
        setCategoriesError("");
        setUnknownError("");

        const response = await createHabit(name, description, motivationalPhrase, importance, difficulty, selectedIcon, experience, categoriesId, t);

        if(response?.success){
            const newHabits = await getHabits(t);
            if(Array.isArray(newHabits.success)){
                setHabits(newHabits.success);
            }
            setName("");
            setDescription("");
            setMotivationalPhrase("");
            setImportance(0);
            setDifficulty(0);
            setSelectedIcon("");
            setExperience(0);
            setCategoriesIdList([]);
        }

        if(response?.validation){
            const formattedResponse = response.validation
            switch(formattedResponse){
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
                case t("YupGenericMaxLength"):
                    setMotivationalPhraseError(formattedResponse);
                    scrollToTop();
                    break;
                case t("YupImportanceRequired"):
                    setImportanceError(formattedResponse);
                    scrollToTop();
                    break;
                case t("YupDifficultyRequired"):
                    setDifficultyError(formattedResponse);
                    break;
                case t('YupIconRequired'):
                    setIconError(formattedResponse);
                    break;
                case t('YupRequiredExperience'):
                    setExperienceError(formattedResponse);
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
            <div className="flex text-3xl items-center justify-center mt-3 mb-3"> 
                <CgAddR className='w-[40px] h-[40px] mr-1'/>
                <h1>{t('CreateHabit')}</h1>
            </div>
            <form  onSubmit={handleCreateHabit}
            className="flex flex-col items-center px-2">
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
                        placeholder={"HabitDescriptionPlaceholder"}
                        minH={178}
                        minHSmallScreen={110}/>

                        <GenericInput
                        t={t}
                        data={motivationalPhrase}
                        setData={setMotivationalPhrase}
                        dataError={motivationalPhraseError}
                        placeholder={"MotivationalPhrasePlaceholder"}
                        name={"MotivationPhrase"} />
                        
                    </div>

                    <div className='mx-2'></div>

                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsBox 
                        search={search}
                        setSearch={setSearch}
                        iconError={iconError}
                        selectedIcon={selectedIcon}
                        setSelectedIcon={setSelectedIcon}
                        t={t}
                        minLgH={272}
                        minHSmallScreen={200}
                        />

                        <ExperienceInput t={t}
                        experience={experience} 
                        setExperience={setExperience}
                        experienceError={experienceError}/>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center w-full md:w-[80%] ">
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
                    name={"difficulty"}
                    t={t} />
                </div>
                <div>
                    <ChooseCategories
                    categoriesIdList={categoriesId}
                    setCategoriesIdList={setCategoriesIdList}
                    errorMessage={categoriesError}
                    chosenCategories={null}/>
                </div>
                <p className='text-error text-lg text-center'>{unknownError}</p>
                <div className="mb-3">
                    <Button text={t("Create")} mode='create' size='big'/>
                </div>
            </form>
        </div>
    )
}

export default CreateHabit;
