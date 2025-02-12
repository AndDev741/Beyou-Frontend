import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import addIcon from '../../assets/addIcon.svg';
import iconRender from '../icons/iconsRender';
import Button from '../button';
import createCategory from '../../services/categories/createCategory';
import getCategories from '../../services/categories/getCategories';
import NameInput from '../inputs/nameInput';
import DescriptionInput from '../inputs/descriptionInput';
import ExperienceInput from '../inputs/experienceInput';
import IconsInput from '../inputs/iconsInput';

function CreateCategory({generatedCategories, setCategories}){
    const {t} = useTranslation();

    const [generatedCategory, setGeneratedCategory] = useState("");
    const [generatedDescription, setGeneratedDescription] = useState("");

    const userId = useSelector(state => state.perfil.id)
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [experience, setExperience] = useState(0);
    const [selectIcon, setSelectIcon] = useState(null);

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [experienceError, setExperienceError] = useState("");
    const [iconError, setIconError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    const [search, setSearch] = useState("");
    const [icons, setIcons] = useState([]);

    useEffect(() => {
        if(generatedCategories?.category){
            const {category, description} = generatedCategories;
            setGeneratedCategory(category);
            setGeneratedDescription(description);
            setName(generatedCategory);
            setDescription(generatedDescription);
        }
    }, [generatedCategories, generatedCategory, generatedDescription]);
    
    useEffect(() => {
        setIcons((icons) => iconRender(search, selectIcon, icons));
    }, [search, selectIcon])

    const handleCreate = async (e) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setExperienceError("");
        setIconError("");
        setUnknownError("");

        const response = await createCategory(userId, name, description, experience, selectIcon, t);

        if(response.success){
            const response = await getCategories(userId);
            setCategories(response.success);
            setName("");
            setDescription("");
            setSelectIcon(null);

        }

        if(response.error){
            setUnknownError(response.error);
        }

        if(response.validation){
            const validation = response.validation[0]
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
            className='flex flex-col mt-8 '>
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-5'>
                        <NameInput name={name} 
                        placeholder={"CategoryNamePlaceholder"}
                        setName={setName} 
                        nameError={nameError}
                        t={t} />
                        
                        <DescriptionInput description={description}
                        placeholder={"DescriptionPlaceholder"}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        minH={100}
                        t={t} />

                        <ExperienceInput experience={experience}
                        setExperience={setExperience}
                        experienceError={experienceError}
                        t={t} />
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput icons={icons}
                        search={search}
                        setSearch={setSearch}
                        t={t}
                        iconError={iconError}
                        setSelectIcon={setSelectIcon}
                        selectIcon={selectIcon}
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