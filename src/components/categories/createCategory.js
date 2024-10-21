import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import addIcon from '../../assets/addIcon.svg';
import iconRender from './iconsRender';
import Button from '../button';
import createCategory from '../../services/categories/createCategory';

function CreateCategory(){
    const {t} = useTranslation();
    const labelCss = "text-blueMain text-2xl md:text-xl";
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[90vw] h-[50px] md:w-[320px] lg:w-[15rem]";

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
            window.location.reload();
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
                        <label htmlFor='name' 
                        className={labelCss}>{t('Name')}</label>
                        <p className='text-red-500 text-lg'>{nameError}</p>
                        <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        name='name'
                        id='name'
                        placeholder={t('CategoryNamePlaceholder')}
                        className={`${borderCss} ${nameError ? "border-red-500" : ""} h-[40px] outline-none pl-2 text-lg`}/>
                        
                        <label htmlFor='description' 
                        className={`${labelCss} mt-2`}>
                            {t('Description')}
                        </label>
                        <p className='text-red-500 text-lg'>{descriptionError}</p>
                        <textarea id='description'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        name='description'
                        placeholder={t('DescriptionPlaceholder')}
                        className={`${borderCss} ${descriptionError ? "border-red-500" : ""} outline-none text-lg p-1 min-h-[84px] lg:min-h-[100px]`}
                        />

                        <label htmlFor='experience' 
                        className={`${labelCss} mt-2`}>{t('YourExperience')}</label>
                        <p className='text-red-500 text-lg'>{experienceError}</p>
                        <select id='experience'
                        name='experience'
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className={`${borderCss} ${experienceError ? "border-red-500" : ""}} h-[50px] text-xl pl-1 outline-none`}>
                            <option value={0}>{t("Begginer")}</option>
                            <option value={1}>{t('Intermediary')}</option>
                            <option value={2}>{t('Advanced')}</option>
                        </select>
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <div className='flex'>
                            <label htmlFor='icon'
                            className={labelCss}>{t('Icon')}</label>
                            <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            name='icon'
                            className='md:w-[190px] ml-1 pl-1 border-[1px] rounded-md outline-none'
                            placeholder={t('IconPlaceholder')}
                            />
                        </div>
                        <p className='text-red-500 text-lg'>{iconError}</p>
                        <div className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-red-500" : ""} min-h-[200px] md:h-[255px] lg:h-[272px] p-2`}>
                            {icons.map((index) => (
                                <p onClick={() => setSelectIcon(index.name)}
                                key={index.name}
                                className={`${index.name === selectIcon ? "scale-110 text-blueMain border-2 border-blueMain rounded-md" : "text-gray-500 "}
                                text-4xl m-1 hover:text-blueMain hover:scale-105 cursor-pointer`}>
                                    <index.IconComponent/>
                                </p>
                            ))}
                        </div>
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