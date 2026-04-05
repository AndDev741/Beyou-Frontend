//functions
import { useEffect, useState } from "react";
import googleRequest from "./request/googleRequest";
//Redux
import { successRegisterEnter } from "../../redux/authentication/registerSlice";
import { nameEnter, emailEnter, phraseEnter, phraseAuthorEnter, constanceEnter, photoEnter, isGoogleAccountEnter, widgetsIdInUseEnter, themeInUseEnter, xpEnter, levelEnter, nextLevelXpEnter, actualLevelXpEnter, alreadyIncreaseConstanceTodayEnter, maxConstanceEnter, languageInUserEnter, tutorialCompletedEnter, timezoneEnter, xpDecayStrategyEnter } from "../../redux/user/perfilSlice";
//Types
import { UserType } from "../../types/user/UserType";
import { TFunction } from "i18next";
import { NavigateFunction } from "react-router-dom";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { themes } from "../../components/utils/listOfThemes";
import { toast } from "react-toastify";

function useGoogleLogin(
    navigate: NavigateFunction,
    dispatch: Dispatch<UnknownAction>,
    t: TFunction
){
    const [codeUsed, setCodeUsed] = useState(false);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authCode = params.get('code');
        const stateParam = params.get('state');
        if(authCode && !codeUsed){
            const savedState = sessionStorage.getItem('oauth_state');
            sessionStorage.removeItem('oauth_state');

            if (!stateParam || stateParam !== savedState) {
                console.error('OAuth state mismatch — possible CSRF attack');
                return;
            }

            setCodeUsed(true);

            googleRequest(authCode).then((response) => {
                if(response.successRegister){
                    dispatch(successRegisterEnter(true));
                }else if(response.success){
                    const data = response.success as UserType;
                    dispatch(nameEnter(data.name));
                    dispatch(emailEnter(data.email));
                    dispatch(phraseEnter(data.phrase));
                    dispatch(phraseAuthorEnter(data.phrase_author));
                    dispatch(constanceEnter(data.constance));
                    dispatch(photoEnter(data.photo));
                    dispatch(isGoogleAccountEnter(data.isGoogleAccount));
                    dispatch(widgetsIdInUseEnter(data.widgetsId));
                    dispatch(themeInUseEnter(themes.find(theme => theme.mode === data?.themeInUse) || null));
                    dispatch(xpEnter(data.xp));
                    dispatch(levelEnter(data.level));
                    dispatch(nextLevelXpEnter(data.nextLevelXp));
                    dispatch(actualLevelXpEnter(data.actualLevelXp));
                    dispatch(alreadyIncreaseConstanceTodayEnter(data.constanceIncreaseToday));
                    dispatch(maxConstanceEnter(data.maxConstance));
                    dispatch(languageInUserEnter(data.languageInUse));
                    dispatch(tutorialCompletedEnter(Boolean(data?.isTutorialCompleted)));
                    dispatch(timezoneEnter(data.timezone));
                    dispatch(xpDecayStrategyEnter(data.xpDecayStrategy));
                    navigate("/dashboard");
                }else if(response.error){
                    toast.error(t('GoogleLoginError'));
                }
            }).catch((error) => {
                console.error(t('GoogleLoginError'), error)
            })

            return () => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            }
        }
    }, [t, codeUsed, navigate, dispatch])
}

export default useGoogleLogin;
