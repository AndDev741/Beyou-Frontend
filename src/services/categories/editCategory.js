import axios from '../axiosConfig';
import * as Yup from 'yup';

async function editCategory(id, name, description, icon, t){
    const editData = {
        categoryId: id,
        name: name,
        icon: icon,
        description: description
    }

    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        icon: Yup.string().required(t('YupIconRequired')),
    })

    try{
        await validation.validate({name, description, icon});

        try{
            const response = await axios.put("/category", editData);
            return response.data;
        }catch(e){
            console.error(e);
            return e.response.data;
        }

    }catch(validationErrors){
        return {validation: validationErrors.errors};
    }
}

export default editCategory;