//functions
import { useEffect, useState } from "react";
import googleRequest from "./request/googleRequest";
//Redux
import { successRegisterEnter } from "@beyou/state/authentication/registerSlice";
import { hydratePerfil } from "../user/hydratePerfil";
//Types
import { UserType } from "@beyou/types/user/UserType";
import { TFunction } from "i18next";
import { NavigateFunction } from "react-router-dom";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { RATE_LIMIT_ERROR_KEY } from "@beyou/api/apiError";

function useGoogleLogin(
    navigate: NavigateFunction,
    dispatch: Dispatch<UnknownAction>,
    t: TFunction,
    /** Called instead of a toast when Google is refused for an unverified account. */
    onEmailNotVerified?: () => void
){
    const [codeUsed, setCodeUsed] = useState(false);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authCode = params.get('code');
        const stateParam = params.get('state');
        if(authCode && !codeUsed){
            // A federated provider's callback lands on this same URL with the same
            // parameter names. Its verifier is still in session storage at this point
            // (this hook runs before useOidcLogin, which is what consumes it), so its
            // presence is what tells the two apart.
            //
            // Without this check, every federated sign-in logged "OAuth state mismatch
            // — possible CSRF attack" from here: alarming, wrong, and pointing at the
            // wrong flow while the real one carried on fine underneath.
            if (sessionStorage.getItem('oidc_code_verifier')) {
                return;
            }

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
                    hydratePerfil(dispatch, data);
                    navigate("/dashboard");
                }else if(response.error === "EMAIL_NOT_VERIFIED"){
                    onEmailNotVerified?.();
                }else if(response.error){
                    toast.error(response.error === RATE_LIMIT_ERROR_KEY
                        ? t(RATE_LIMIT_ERROR_KEY)
                        : t('GoogleLoginError'));
                }
            }).catch((error) => {
                console.error(t('GoogleLoginError'), error)
            })

            return () => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            }
        }
    }, [t, codeUsed, navigate, dispatch, onEmailNotVerified])
}

export default useGoogleLogin;
