import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import editUser from "../services/user/editUser";
import { useDispatch } from "react-redux";
import { languageInUserEnter } from "../redux/user/perfilSlice";

export default function useChangeLanguage(lng: string, updateUser?: boolean) {
    const {i18n} = useTranslation();
    const dispatch = useDispatch();
    console.log("Changing language to => ", lng);
    
    useEffect(() => {
        const updateUserLanguage = async () => {
            const languageToSave = {
                language: lng
            }

            await editUser(languageToSave);
            dispatch(languageInUserEnter(lng));
        }
        if(updateUser) {
            updateUserLanguage();
        }
        
        i18n.changeLanguage(lng);
    }, [lng])

}