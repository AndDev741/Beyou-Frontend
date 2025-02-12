import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {editModeEnter, idEnter, nameEnter, descriptionEnter, iconEnter} from '../../redux/category/editCategorySlice'
import { useTranslation } from 'react-i18next';
import addIcon from '../../assets/addIcon.svg';
import iconRender from '../icons/iconsRender';
import NameInput from '../inputs/nameInput';
import DescriptionInput from '../inputs/descriptionInput';
import IconsInput from '../inputs/iconsInput';
import editCategory from '../../services/categories/editCategory';
import getCategories from '../../services/categories/getCategories';

function EditCategory({setCategories}){
    const {t} = useTranslation();
    const userId = useSelector(state => state.perfil.id);
    const dispatch = useDispatch();

    const categoryId = useSelector(state => state.editCategory.id);
    const nameEdit = useSelector(state => state.editCategory.name);
    const descriptionEdit = useSelector(state => state.editCategory.description);
    const iconEdit = useSelector(state => state.editCategory.icon);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectIcon, setSelectIcon] = useState("");
    const [search, setSearch] = useState("");
    const [icons, setIcons] = useState([]);

    useEffect(() => {
        setName(nameEdit);
        setDescription(descriptionEdit);
        setSelectIcon(iconEdit);
        setSearch(iconEdit);
    }, [nameEdit, descriptionEdit, iconEdit])

    const [nameError, setNameError] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [iconError, setIconError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    
    useEffect(() => {
        setIcons((icons) => iconRender(search, selectIcon, icons));
    }, [search, selectIcon])

    const handleCancel = (e) => {
        dispatch(editModeEnter(false));
        dispatch(idEnter(null));
        dispatch(nameEnter(""));
        dispatch(descriptionEnter(""));
        dispatch(iconEnter(""));
    }

    const handleEdit = async (e) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setIconError("");
        setUnknownError("");

        const response = await editCategory(categoryId , name, description, selectIcon, t);

        if(response.success){
            const categories = await getCategories(userId);
            setCategories(categories.success);
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
                <h2>{t('EditCategory')}</h2>
            </div>
            <form onSubmit={handleEdit}
            className='flex flex-col mt-8 '>
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-5'>
                        <NameInput name={name} 
                        setName={setName} 
                        nameError={nameError}
                        t={t} />
                        
                        <DescriptionInput description={description}
                        placeholder={"DescriptionPlaceholder"}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        t={t} />
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput icons={icons}
                        search={search}
                        setSearch={setSearch}
                        t={t}
                        iconError={iconError}
                        setSelectIcon={setSelectIcon}
                        selectIcon={selectIcon} />
                    </div>
                </div> 
                <p className='text-red-500 text-xl text-center underline'>{unknownError}</p>
                <div className='flex items-center justify-evenly mt-6'>
                    <div>
                        <button type='button'
                        onClick={handleCancel}
                        className='w-[120px] md:w-[200px] h-[45px] bg-gray-500 rounded-[20px] text-white text-lg lg:text-2xl font-semibold hover:bg-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105'>
                            {t('Cancel')}
                        </button>
                    </div>
                    <div>
                        <button 
                        className='w-[120px] md:w-[200px] h-[45px] bg-blueMain rounded-[20px] text-white text-lg lg:text-2xl font-semibold hover:bg-ligthBlue hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105'>
                            {t('Edit')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default EditCategory;