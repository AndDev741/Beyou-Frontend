import axios from '../axiosConfig';
import * as Yup from 'yup';


async function createCategory(userId, name, description, experience, icon, t){
    let level = 0;
    let xp = 0;
    experience = Number(experience)

    switch(experience){
        case 1:
            level += 5
            xp += 750;
            break;
        case 2:
            level = 8;
            xp = 1800;
            break;
        default:
            level = 0;
            xp = 0;
            break;
    }

    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        experience: Yup.number().required(t('YupRequiredExperience')),
        icon: Yup.string().required(t('YupIconRequired')),
    })

    try{
        await validation.validate({name, description, experience, icon, level, xp});
        try{
            const categoryData = {
                userId: userId,
                name: name,
                icon: icon,
                description: description,
                level: level,
                xp: xp,
            }
            const response = await axios.post("/category", categoryData);
            return response.data;
        }catch(e){
            console.error(e);
            return e.response.data;
        }
    }catch(validationErrors){
        return {validation: validationErrors.errors};
    }
}


export default createCategory;