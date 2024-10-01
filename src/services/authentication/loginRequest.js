import axios from '../axiosConfig';
import * as Yup from 'yup';

async function loginRequest(email, password, t){
    const loginData = {
        email: email,
        password: password
    };

    const validationSchema = Yup.object().shape({
        email: Yup.string().required(t('YupNecessaryEmail')).email(t('YupInvalidEmail')).max(256, t('YupMaxLength')),
        password: Yup.string().required(t('YupNecessaryPassword')).max(256, t('YupMaxLength'))
    })

    try{
        await validationSchema.validate({email, password});
        try{
            const response = await axios.post("/auth/login", loginData);
            return response.data;
        }catch(e){
            return e.response.data;
        }
    }catch(validationErrors){
        return {validationErrors: validationErrors.errors.join(", ")}
    }
}

export default loginRequest;