import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import habitIcon from '../../assets/dashboard/shortcuts/habits.svg'
import NameInput from "../inputs/nameInput";
import IconsInput from "../inputs/iconsInput";
import iconRender from "../icons/iconsRender";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "./chooseCategories";
import Button from "../button";

function CreateHabit(){
    const {t} = useTranslation();

    const [selectIcon, setSelectIcon] = useState(null);

    const [search, setSearch] = useState("");
    const [icons, setIcons] = useState([]);
    
    
    useEffect(() => {
        setIcons((icons) => iconRender(search, selectIcon, icons));
    }, [search, selectIcon])

    return(
        <>
            <div className="flex text-3xl items-center justify-center mt-5 mb-3"> 
                <img src={habitIcon}
                alt={t("HabitImgAlt")}
                className="w-[35px] h-[35px] mr-2" />
                <h1>{t('CreateHabit')}</h1>
            </div>
            <form className="flex flex-col items-center">
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-4'>
                        <NameInput t={t}
                        placeholder={"HabitNamePlaceholder"}/>

                        <DescriptionInput t={t}
                        placeholder={"HabitDescriptionPlaceholder"} />

                        <GenericInput
                        t={t}
                        placeholder={"MotivationalPhrasePlaceholder"}
                        name={"MotivationPhrase"} />

                        <ChooseInput
                        choosedLevel={t("Medium")}
                        title={"Importance"}
                        levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                        name={"importance"}
                        t={t} />

                        <div className="block md:hidden">
                            <ChooseInput
                            choosedLevel={"Normal"}
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
                        t={t}/>

                        <div className="hidden md:block">
                            <ChooseInput
                            choosedLevel={"Normal"}
                            title={"Dificulty"}
                            levels={[t("Easy"), t("Normal"), t("Hard"), 
                            t("Terrible")]}
                            name={"dificulty"}
                            t={t} />
                        </div>
                    </div>
                </div>
                <div>
                    <ChooseCategories/>
                </div>
                <div className="my-3">
                    <Button text={t("Create")}/>
                </div>
            </form>
        </>
    )
}

export default CreateHabit;