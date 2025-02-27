import { useTranslation } from "react-i18next";
import { useState } from "react";
import habitIcon from '../../assets/dashboard/shortcuts/habits.svg'
import IconsInput from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import Button from "../Button";
import ExperienceInput from "../inputs/experienceInput";
import createHabit from "../../services/habits/createHabit";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";

function CreateHabit(){
    const {t} = useTranslation();

    const userId = useSelector((state: RootState) => state.perfil.id)
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [motivationalPhrase, setMotivationalPhrase] = useState("");
    const [importance, setImportance] = useState(0);
    const [dificulty, setDificulty] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState("");
    const [experience, setExperience] = useState(0);
    const [categoriesId, setCategoriesIdList] = useState<string[]>([""]);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [motivationalPhraseError, setMotivationalPhraseError] = useState("");
    const [importanceError, setImportanceError] = useState("");
    const [dificultyError, setDificultyError] = useState("");
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
        setDificultyError("");
        setIconError("");
        setExperienceError("");
        setCategoriesError("");

        const response = await createHabit(userId, name, description, motivationalPhrase, importance, dificulty, selectedIcon, experience, categoriesId, t);

        if(response?.success){
            window.location.reload();
        }

        if(response?.validation){
            const formattedResponse = response.validation[0]
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
                case t("YupDificultyRequired"):
                    setDificultyError(formattedResponse);
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
        <div>
            <div className="flex text-3xl items-center justify-center mt-5 mb-3"> 
                <img src={habitIcon}
                alt={t("HabitImgAlt")}
                className="w-[35px] h-[35px] mr-2" />
                <h1>{t('CreateHabit')}</h1>
            </div>
            <form  onSubmit={handleCreateHabit}
            className="flex flex-col items-center">
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-4'>
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
                        minH={0}/>

                        <GenericInput
                        t={t}
                        data={motivationalPhrase}
                        setData={setMotivationalPhrase}
                        dataError={motivationalPhraseError}
                        placeholder={"MotivationalPhrasePlaceholder"}
                        name={"MotivationPhrase"} />
                        
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput 
                        search={search}
                        setSearch={setSearch}
                        iconError={iconError}
                        selectedIcon={selectedIcon}
                        setSelectedIcon={setSelectedIcon}
                        t={t}
                        minLgH={0}/>

                        <ExperienceInput t={t}
                        experience={experience} 
                        setExperience={setExperience}
                        experienceError={experienceError}/>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center w-full ">
                    <ChooseInput
                    choosedLevel={importance}
                    setLevel={setImportance}
                    title={"Importance"}
                    levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                    error={importanceError}
                    name={"importance"}
                    t={t} />

                
                    <ChooseInput
                    choosedLevel={dificulty}
                    error={dificultyError}
                    setLevel={setDificulty}
                    title={"Dificulty"}
                    levels={[t("Easy"), t("Normal"), t("Hard"), 
                    t("Terrible")]}
                    name={"dificulty"}
                    t={t} />
                </div>
                <div>
                    <ChooseCategories
                    categoriesIdList={categoriesId}
                    setCategoriesIdList={setCategoriesIdList}
                    errorMessage={categoriesError}
                    chosenCategories={null}/>
                </div>
                <p className='text-red-500 text-lg text-center'>{unknownError}</p>
                <div className="mb-3">
                    <Button text={t("Create")}/>
                </div>
            </form>
        </div>
    )
}

export default CreateHabit;