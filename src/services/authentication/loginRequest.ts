import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { UserType } from '../../types/user/UserType';

async function loginRequest(email: string, password: string, t: TFunction): Promise<Record<string, UserType | string>>{
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
            const response = await axios.post<Record<string, UserType>>("/auth/login", loginData);
            return response.data;
        }catch(e){
            console.error(e);
            return {error: " "};
        }
    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            return {validationErrors: validationErrors.errors.join(", ")}
        }
        return {error: " "};
    }
}

export default loginRequest;