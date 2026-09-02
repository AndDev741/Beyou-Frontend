import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { TFunction } from "i18next";
import { NavigateFunction } from "react-router-dom";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { oidcLogin, OidcLinkRequiredReason } from "@beyou/api";
import { UserType } from "@beyou/types/user/UserType";
import axios from "../axiosConfig";
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
                    // The JWT lives only in-memory, so the login response is the one
                    // place it has to be captured — and it must be captured here, not
                    // left to a first authenticated request racing a refresh. The
                    // httpOnly cookie gives ProtectedRoute its "hasRuntimeToken" signal,
                    // and every dashboard fetch needs the bearer token on the wire.
                    // Password and Google login capture the same header at their call
                    // site (loginRequest.ts, googleRequest.ts); missing this line made
                    // the federated path rely on a race and fail the sign-in for real
                    // trips between the exchange and the redirect.
                    if (result.accessToken) {
                        axios.defaults.headers.common.Authorization = `Bearer ${result.accessToken}`;
                    }
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
            });
        // No .finally() cleaning the URL here: completeOidcLogin does it up front,
        // before the exchange. Doing it after navigate() raced with React Router and
        // sometimes put the login URL back, cancelling the redirect to the dashboard.
    }, [t, handled, navigate, dispatch, onLinkRequired]);
}

export default useOidcLogin;
