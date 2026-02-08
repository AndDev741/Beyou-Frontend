import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {editModeEnter, idEnter, nameEnter, descriptionEnter, iconEnter} from '../../redux/category/editCategorySlice'
import { useTranslation } from 'react-i18next';
import DescriptionInput from '../inputs/descriptionInput';
import IconsInput from '../inputs/iconsBox';
import editCategory from '../../services/categories/editCategory';
import getCategories from '../../services/categories/getCategories';
import { RootState } from '../../redux/rootReducer';
import GenericInput from '../inputs/genericInput';
import { CgAddR } from 'react-icons/cg';
import Button from '../Button';
import { toast } from 'react-toastify';
import ErrorNotice from '../ErrorNotice';
import { ApiErrorPayload, getFriendlyErrorMessage } from '../../services/apiError';

type prop = {dispatchFunction: any};

function EditCategory({dispatchFunction}: prop){
    const {t} = useTranslation();
    const dispatch = useDispatch();

    const categoryId = useSelector((state: RootState) => state.editCategory.id);
    const nameEdit = useSelector((state: RootState) => state.editCategory.name);
    const descriptionEdit = useSelector((state: RootState) => state.editCategory.description);
    const iconEdit = useSelector((state: RootState) => state.editCategory.icon);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        setName(nameEdit);
        setDescription(descriptionEdit);
        setSelectedIcon(iconEdit);
        setSearch(iconEdit);
    }, [nameEdit, descriptionEdit, iconEdit])

    const [nameError, setNameError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [descriptionError, setDescriptionError] = useState("");
    const [iconError, setIconError] = useState("");
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

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
        setApiError(null);
        setSuccessMessage("");

        const response = await editCategory(categoryId , name, description, selectedIcon, t);

        if(response.success){
            const categories = await getCategories(t);
            if(Array.isArray(categories.success)){
                dispatch(dispatchFunction(categories.success));
                setSuccessMessage(t('edited successfully'));
            }
            toast.success(t('edited successfully'));
        }

        if(response.error){
            setApiError(response.error);
            toast.error(getFriendlyErrorMessage(t, response.error));
        }

        if(response.validation){
            const validation = response.validation;
            toast.error(validation);
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
                    setApiError({ message: validation });
                    break;
            }
        }
    }
    
    return(
        <div className="bg-background">
            <div className='flex items-center justify-center text-3xl font-semibold'>
                <CgAddR className='w-[40px] h-[40px] mr-1'/>
                <h2>{t('EditCategory')}</h2>
            </div>
            <form onSubmit={handleEdit}
            className='flex flex-col mt-8 '>
                <div className='flex md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start md:justify-start'>
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
                        minH={178}
                        minHSmallScreen={110}

                        t={t} />
                    </div>

                    <div className='mx-2'></div>

                    <div className='flex flex-col mt-2 md:mt-0'>
                        <IconsInput
                        search={search}
                        setSearch={setSearch}
                        minLgH={273}
                        minHSmallScreen={200}
                        t={t}
                        iconError={iconError}
                        setSelectedIcon={setSelectedIcon}
                        selectedIcon={selectedIcon} />
                    </div>
                </div> 
                <ErrorNotice error={apiError} className="text-center underline" />
                <p className='text-success text-xl text-center underline mt-3'>{successMessage}</p>
                <div className='flex items-center justify-evenly mt-3'>
                    <div>
                        <Button text={t('Cancel')} mode='cancel' size='medium' onClick={handleCancel} />
                    </div>
                    <div>
                        <Button text={t('Edit')} mode='create' size='medium' />
                    </div>
                </div>
            </form>
        </div>
    )
}

export default EditCategory;
