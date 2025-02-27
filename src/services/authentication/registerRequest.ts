import axios from "axios";
import * as Yup from 'yup';

const registerRequest = async (name: string, email: string, password:string, t:Function)
: Promise<Record<string, string>> => {
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
            return {error: " "};
        }
    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            return {validationErrors: validationErrors.errors.join(", ")}
        }
        return {error: " "};
    }
}

export default registerRequest;
    
