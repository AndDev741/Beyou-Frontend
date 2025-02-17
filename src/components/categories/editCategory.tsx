import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {editModeEnter, idEnter, nameEnter, descriptionEnter, iconEnter} from '../../redux/category/editCategorySlice'
import { useTranslation } from 'react-i18next';
import iconRender from '../icons/iconsRender';
import addIcon from "../../assets/addIcon.svg";
import NameInput from '../inputs/nameInput';
import DescriptionInput from '../inputs/descriptionInput';
import IconsInput from '../inputs/iconsInput';
import editCategory from '../../services/categories/editCategory';
import getCategories from '../../services/categories/getCategories';
import categoryType from '../../types/category/categoryType';
import { RootState } from '../../redux/rootReducer';

type prop = {setCategories: React.Dispatch<React.SetStateAction<categoryType[]>>};

function EditCategory({setCategories}: prop){
    const {t} = useTranslation();
    const userId = useSelector((state: RootState) => state.perfil.id);
    const dispatch = useDispatch();

    const categoryId = useSelector((state: RootState) => state.editCategory.id);
    const nameEdit = useSelector((state: RootState) => state.editCategory.name);
    const descriptionEdit = useSelector((state: RootState) => state.editCategory.description);
    const iconEdit = useSelector((state: RootState) => state.editCategory.icon);

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
    const [successMessage, setSuccessMessage] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [iconError, setIconError] = useState("");
    const [unknownError, setUnknownError] = useState("");

    
    useEffect(() => {
        setIcons((icons) => iconRender(search, selectIcon, icons));
    }, [search, selectIcon])

    const handleCancel = () => {
        dispatch(editModeEnter(false));
        dispatch(idEnter(null));
        dispatch(nameEnter(""));
        dispatch(descriptionEnter(""));
        dispatch(iconEnter(""));
    }

    const handleEdit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setNameError("");
        setDescriptionError("");
        setIconError("");
        setUnknownError("");
        setSuccessMessage("");

        const response = await editCategory(categoryId , name, description, selectIcon, t);

        if(response.success){
            const categories = await getCategories(userId, t);
            if(Array.isArray(categories.success)){
                setCategories(categories.success);
                setSuccessMessage(t('edited successfully'));
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
                    <div className='flex flex-col md:items-start mx-4'>
                        <NameInput name={name} 
                        setName={setName} 
                        nameError={nameError}
                        placeholder={""}
                        t={t} />
                        
                        <DescriptionInput description={description}
                        placeholder={"DescriptionPlaceholder"}
                        setDescription={setDescription}
                        descriptionError={descriptionError}
                        minH={0}
                        t={t} />
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput icons={icons}
                        search={search}
                        setSearch={setSearch}
                        minLgH={0}
                        t={t}
                        iconError={iconError}
                        setSelectIcon={setSelectIcon}
                        selectIcon={selectIcon} />
                    </div>
                </div> 
                <p className='text-red-500 text-xl text-center underline'>{unknownError}</p>
                <p className='text-blue-500 text-xl text-center underline mt-3'>{successMessage}</p>
                <div className='flex items-center justify-evenly mt-3'>
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