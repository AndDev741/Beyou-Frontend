import axios from "axios";
import * as Yup from 'yup';

const registerRequest = async (name, email, password, t) => {
    const validationSchema = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxLength')),
        email: Yup.string().required(t('YupNecessaryEmail')).email(t('YupInvalidEmail')).max(256, t('YupMaxLength')),
        password: Yup.string().required(t('YupNecessaryPassword')).min(6, t('YupMinimumPassword')).max(256, t('YupMaxLength'))
    });

    const registerData = {
        name: name,
        email: email,
        password: password
    }

    try{
        await validationSchema.validate({name, email, password});
        try{
            const response = await axios.post("http://localhost:8080/auth/register", registerData);
            return response.data;
        }catch(e){
            console.error(e);
            return e.response.data;
        }
    }catch(validationErrors){
        if(validationErrors.errors){
            return {validationErrors: validationErrors.errors.join(", ")}
        }
    }
}

export default registerRequest;
    
