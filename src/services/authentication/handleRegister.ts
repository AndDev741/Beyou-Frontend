//functions
import registerRequest from "./request/registerRequest";
//Services
import { successRegisterEnter } from "../../redux/authentication/registerSlice";
//Types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { NavigateFunction } from "react-router-dom";

export default async function handleRegister(
    e: React.FormEvent<HTMLFormElement>,
    name: string,
    email: string,
    password: string,
    t: TFunction,
    dispatch: Dispatch<UnknownAction>,
    navigate: NavigateFunction,
    setNameError: React.Dispatch<React.SetStateAction<string>>,
    setEmailError: React.Dispatch<React.SetStateAction<string>>,
    setPasswordError: React.Dispatch<React.SetStateAction<string>>,
    setDefaultError: React.Dispatch<React.SetStateAction<string>>
){
        e.preventDefault();
        setNameError("");
        setEmailError("");
        setPasswordError("");
        setDefaultError("");

        const response = await registerRequest(name, email, password, t);
        if(response.validationErrors){
            switch(response.validationErrors){
                case `${t('YupNameRequired')}`:
                    setNameError(response.validationErrors);
                    break;
                case `${t('YupMinimumName')}`:
                    setNameError(response.validationErrors);
                    break;
                case `${t('YupInvalidEmail')}`:
                    setEmailError(response.validationErrors);
                    break;
                case `${t('YupNecessaryEmail')}`:
                    setEmailError(response.validationErrors);
                    break;
                case `${t('YupNecessaryPassword')}`:
                    setPasswordError(response.validationErrors);
                    break;
                case `${t('YupMinimumPassword')}`:
                    setPasswordError(response.validationErrors);
                    break;
                case `${t('YupMaxLength')}`:
                    setDefaultError(response.validationErrors);
                    break;
                default:
                    setDefaultError(t('UnkownError'))
                    break;
            }
        }else if(response.success){
            dispatch(successRegisterEnter(true));
            navigate("/");
        }else if(response.error){
            setEmailError(t('EmailInUseError'));
        }

}