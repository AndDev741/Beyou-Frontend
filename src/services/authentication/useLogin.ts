//functions
import loginRequest from "./request/loginRequest";
//redux
import { nameEnter, emailEnter, phraseEnter, phraseAuthorEnter, constaceEnter, photoEnter, isGoogleAccountEnter, widgetsIdInUseEnter } from "../../redux/user/perfilSlice";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
//types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "../../types/user/UserType";
import { NavigateFunction } from "react-router-dom";

export default async function handleLogin (
    e: React.FormEvent<HTMLFormElement>,
    email: string,
    password: string,
    t: TFunction,
    dispatch: Dispatch<UnknownAction>,
    navigate: NavigateFunction,
    setEmailError: React.Dispatch<React.SetStateAction<string>>,
    setPasswordError: React.Dispatch<React.SetStateAction<string>>,
    setDefaultError: React.Dispatch<React.SetStateAction<string>>
) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setDefaultError("");

    const response = await loginRequest(email, password, t);
    if(response.validationErrors){
        switch(response.validationErrors){
            case t('YupNecessaryEmail'):
                setEmailError(response.validationErrors);
                break;
            case t('YupInvalidEmail'):
                setEmailError(t('YupInvalidEmail'));
                break;
            case t('YupMaxLength'):
                setDefaultError(t('YupMaxLength'));
                break;
            case t('YupNecessaryPassword'):
                setPasswordError(t('YupNecessaryPassword'));
                break;
            default:
                dispatch(defaultErrorEnter(t('UnkownError')));
        }
    }else if(response.error){
        dispatch(defaultErrorEnter(t('WrongPassOrEmailError')));
        setEmailError(t('WrongPassOrEmailError'))
        setPasswordError(" ")
        setDefaultError(t('WrongPassOrEmailError'));
    }else if(response.success){
        const data = response.success as UserType;
        console.log(data);
        dispatch(nameEnter(data.name));
        dispatch(emailEnter(data.email));
        dispatch(phraseEnter(data.phrase));
        dispatch(phraseAuthorEnter(data.phrase_author));
        dispatch(constaceEnter(data.constance));
        dispatch(photoEnter(data.photo));
        dispatch(isGoogleAccountEnter(data.isGoogleAccount));
        dispatch(widgetsIdInUseEnter(data.widgetsId));
        navigate("/dashboard");
    }
}