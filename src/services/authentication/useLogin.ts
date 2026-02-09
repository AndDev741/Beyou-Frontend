// functions
import loginRequest from "./request/loginRequest";
// redux
import {
    nameEnter,
    emailEnter,
    phraseEnter,
    phraseAuthorEnter,
    constanceEnter,
    photoEnter,
    isGoogleAccountEnter,
    widgetsIdInUseEnter,
    themeInUseEnter,
    xpEnter,
    levelEnter,
    nextLevelXpEnter,
    actualLevelXpEnter,
    alreadyIncreaseConstanceTodayEnter,
    maxConstanceEnter,
    languageInUserEnter
} from "../../redux/user/perfilSlice";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
// types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "../../types/user/UserType";
import { NavigateFunction } from "react-router-dom";
import { themes } from "../../components/utils/listOfThemes";

export default async function handleLogin(
    email: string,
    password: string,
    t: TFunction,
    dispatch: Dispatch<UnknownAction>,
    navigate: NavigateFunction
): Promise<string | null> {
    const response = await loginRequest(email, password);
    if (response.error) {
        const message = t("WrongPassOrEmailError");
        dispatch(defaultErrorEnter(message));
        return message;
    }
    if (response.success) {
        const data = response.success as UserType;
        dispatch(nameEnter(data.name));
        dispatch(emailEnter(data.email));
        dispatch(phraseEnter(data.phrase));
        dispatch(phraseAuthorEnter(data.phrase_author));
        dispatch(constanceEnter(data.constance));
        dispatch(photoEnter(data.photo));
        dispatch(isGoogleAccountEnter(data.isGoogleAccount));
        dispatch(widgetsIdInUseEnter(data.widgetsId));
        dispatch(themeInUseEnter(themes.find((theme) => theme.mode === data?.themeInUse) || null));
        dispatch(xpEnter(data.xp));
        dispatch(levelEnter(data.level));
        dispatch(nextLevelXpEnter(data.nextLevelXp));
        dispatch(actualLevelXpEnter(data.actualLevelXp));
        dispatch(alreadyIncreaseConstanceTodayEnter(data.constanceIncreaseToday));
        dispatch(maxConstanceEnter(data.maxConstance));
        dispatch(languageInUserEnter(data.languageInUse));
        navigate("/dashboard");
        return null;
    }
    return t("UnkownError");
}
