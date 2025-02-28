import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import Button from '../Button';
import createCategory from '../../services/categories/createCategory';
import getCategories from '../../services/categories/getCategories';
import addIcon from "../../assets/addIcon.svg";
import DescriptionInput from '../inputs/descriptionInput';
import ExperienceInput from '../inputs/experienceInput';
import IconsInput from '../inputs/iconsBox';
import categoryGeneratedByAi from '../../types/category/categoryGeneratedByAiType';
import * as React from 'react';
import categoryType from '../../types/category/categoryType';
import { RootState } from '../../redux/rootReducer';
import GenericInput from '../inputs/genericInput';

type props = {
    generatedCategory: categoryGeneratedByAi,
    setCategories: React.Dispatch<React.SetStateAction<categoryType[]>>
}

function CreateCategory({generatedCategory, setCategories}: props){
    const {t} = useTranslation();

    const [generatedCategoryName, setGeneratedCategoryName] = useState("");
    const [generatedDescription, setGeneratedDescription] = useState("");

    const userId: string = useSelector((state: RootState) => state.perfil.id);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [experience, setExperience] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState("");

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [experienceError, setExperienceError] = useState("");
    const [iconError, setIconError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    const [search, setSearch] = useState("");
    
    useEffect(() => {
        if(generatedCategory?.categoryName){
            const {categoryName, description} = generatedCategory;
            setGeneratedCategoryName(categoryName);
            setGeneratedDescription(description);
            setName(generatedCategoryName);
            setDescription(generatedDescription);
        }
    }, [generatedCategory, generatedCategoryName, generatedDescription]);

    const handleCreate = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setExperienceError("");
        setIconError("");
        setUnknownError("");

        const response = await createCategory(userId, name, description, experience, selectedIcon, t);

        if(response.success){
            const newCategories = await getCategories(userId, t);
            if(Array.isArray(newCategories.success)){
                setCategories(newCategories.success);
                setName("");
                setDescription("");
                setSelectedIcon("");
            }
        
        }

        if(response.error){
            setUnknownError(response.error);
        }

        if(response.validation){
            const validation = response.validation;
            switch(validation){
                case t('YupNameRequired') || t('YupMinimumName') || t('YupMaxName'):
                    setNameError(validation);
                    break;
                case t('YupDescriptionMaxValue'):
                    setDescriptionError(validation);
                    break;
                case t('YupRequiredExperience'):
                    setExperienceError(validation);
                    break;
                case t('YupIconRequired'):
                    setIconError(validation);
                    break;
                default: 
                    setUnknownError(validation);
                    break;
            }
        }
    }
    
    return(
        <div>
            <div className='flex items-center justify-center text-3xl font-semibold'>
                <img className='w-[40px] mr-1'
                alt={t('CreateCategoryImgAlt')} 
                src={addIcon}/>
                <h2>{t('CreateCategory')}</h2>
            </div>
            <form onSubmit={handleCreate} 
            className='flex flex-col mt-8'>
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-4'>
                        <GenericInput 
                        name='Name'
                        data={name} 
                        placeholder={"CategoryNamePlaceholder"}
                        setData={setName} 
                        dataError={nameError}
                        t={t} />

                        <DescriptionInput description={description}
                        placeholder={"DescriptionPlaceholder"}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        minH={115}
                        t={t} />

                        <ExperienceInput experience={experience}
                        setExperience={setExperience}
                        experienceError={experienceError}
                        t={t} />
                    </div>

                    <div className='flex flex-col mt-2 md:mt-0 w-auto'>
                        <IconsInput
                        search={search}
                        setSearch={setSearch}
                        t={t}
                        iconError={iconError}
                        setSelectedIcon={setSelectedIcon}
                        selectedIcon={selectedIcon}
                        minLgH={275} />
                    </div>
                </div>
                <div className='flex items-center justify-center mt-6'>
                <p className='text-red-500 text-lg'>{unknownError}</p>
                    <Button text={t('Create')} />
                </div>
            </form>
        </div>
    )
}

export default CreateCategory;