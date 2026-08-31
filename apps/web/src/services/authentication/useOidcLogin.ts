import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { TFunction } from "i18next";
import { NavigateFunction } from "react-router-dom";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { oidcLogin, OidcLinkRequiredReason } from "@beyou/api";
import { UserType } from "@beyou/types/user/UserType";
import { hydratePerfil } from "../user/hydratePerfil";
import { completeOidcLogin } from "./oidcPkce";
import { detectTimezone } from "../user/reconcileTimezone";

const issuer = import.meta.env.VITE_OIDC_ISSUER;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';

/**
 * Catches the return leg of a federated sign-in.
 *
 * <p>Sits beside {@code useGoogleLogin} on the same screen and they both watch for a
 * {@code code} in the URL. {@code completeOidcLogin} only claims the ones it started —
 * a verifier of ours still in session storage — so Google's callback falls through to
 * Google's hook and vice versa.
 *
 * @param onLinkRequired called when the identity verified but may not enter alone. Not an
 *                       error path: the screen explains that this provider has to be
 *                       linked from inside the account first.
 */
function useOidcLogin(
    navigate: NavigateFunction,
    dispatch: Dispatch<UnknownAction>,
    t: TFunction,
    onLinkRequired?: (reason: OidcLinkRequiredReason, provider: string) => void,
) {
    const [handled, setHandled] = useState(false);

    useEffect(() => {
        if (!issuer || !clientId || handled) return;
        if (!new URLSearchParams(window.location.search).get('code')) return;

        setHandled(true);

        completeOidcLogin({ issuer, clientId, redirectUri: appUrl + '/' })
            .then(async (callback) => {
                if (!callback) return;

                const result = await oidcLogin(callback.slug, callback.idToken, detectTimezone() ?? undefined);

                if (result.kind === 'success') {
                    hydratePerfil(dispatch, result.user as unknown as UserType);
                    navigate('/dashboard');
                } else if (result.kind === 'linkRequired') {
                    onLinkRequired?.(result.reason, result.provider);
                } else {
                    toast.error(t('OidcLoginError'));
                }
            })
            .catch((e) => {
                console.error(e);
                toast.error(t('OidcLoginError'));
            })
            .finally(() => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            });
    }, [t, handled, navigate, dispatch, onLinkRequired]);
}

export default useOidcLogin;
