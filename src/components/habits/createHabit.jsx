import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import habitIcon from '../../assets/dashboard/shortcuts/habits.svg'
import NameInput from "../inputs/nameInput";
import IconsInput from "../inputs/iconsInput";
import iconRender from "../icons/iconsRender";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import Button from "../Button";
import ExperienceInput from "../inputs/experienceInput";
import createHabit from "../../services/habits/createHabit";
import { useSelector } from "react-redux";

function CreateHabit(){
    const {t} = useTranslation();

    const userId = useSelector(state => state.perfil.id)
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [motivationalPhrase, setMotivationalPhrase] = useState("");
    const [importance, setImportance] = useState(null);
    const [dificulty, setDificulty] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [experience, setExperience] = useState(0);
    const [categories, setCategories] = useState([]);

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
    const [icons, setIcons] = useState([]);
    useEffect(() => {
        setIcons((icons) => iconRender(search, selectedIcon, icons));
    }, [search, selectedIcon])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    const handleCreateHabit = async (e) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setMotivationalPhraseError("");
        setImportanceError("");
        setDificultyError("");
        setIconError("");
        setExperienceError("");
        setCategoriesError("");

        const response = await createHabit(userId, name, description, motivationalPhrase, importance, dificulty, selectedIcon, experience, categories, t);

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
                        <NameInput t={t}
                        name={name}
                        setName={setName}
                        nameError={nameError}
                        placeholder={"HabitNamePlaceholder"}/>

                        <DescriptionInput t={t}
                        description={description}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        placeholder={"HabitDescriptionPlaceholder"}/>

                        <GenericInput
                        t={t}
                        data={motivationalPhrase}
                        setData={setMotivationalPhrase}
                        dataError={motivationalPhraseError}
                        placeholder={"MotivationalPhrasePlaceholder"}
                        name={"MotivationPhrase"} />

                        <ChooseInput
                        choosedLevel={importance}
                        setLevel={setImportance}
                        title={"Importance"}
                        levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                        error={importanceError}
                        name={"importance"}
                        t={t} />

                        <div className="block md:hidden">
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
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput 
                        icons={icons}
                        search={search}
                        setSearch={setSearch}
                        iconError={iconError}
                        selectIcon={selectedIcon}
                        setSelectIcon={setSelectedIcon}
                        t={t}/>

                        <ExperienceInput t={t}
                        experience={experience} 
                        setExperience={setExperience}
                        experienceError={experienceError}/>

                        <div className="hidden md:block">
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
                    </div>
                </div>
                <div>
                    <ChooseCategories
                    categoriesList={categories}
                    setCategoriesList={setCategories}
                    errorMessage={categoriesError}/>
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