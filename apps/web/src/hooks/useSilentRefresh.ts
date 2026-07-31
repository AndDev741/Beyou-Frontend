import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "../services/axiosConfig";
import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";
import reportRefreshFailure from "../services/authentication/reportRefreshFailure";
import getProfile from "@beyou/api/user/getProfile";
import { hydratePerfil } from "../services/user/hydratePerfil";

export type AuthBootState = "checking" | "authenticated" | "unauthenticated";

/**
 * Silent token refresh on app boot.
 *
 * The JWT access token lives only in-memory (axios defaults), so a page refresh
 * loses it. The httpOnly refresh cookie survives the reload, so we can trade it
 * for a fresh access token before mounting routes — preventing the flash of 401s
 * that would otherwise fire from every component's mount effect.
 *
 * The `perfil` slice (theme, tutorial-completed flag, language, profile data) is
 * NOT persisted to localStorage (it holds PII), so a refresh would otherwise
 * drop it. After restoring the token we re-fetch the profile and re-hydrate the
 * slice so theme/tutorial/etc. survive a reload.
 *
 * - "checking"        — refresh in flight, show a loader
 * - "authenticated"   — access token restored, safe to mount routes
 * - "unauthenticated" — no valid refresh cookie, routes/guards will redirect to /
 */
export function useSilentRefresh(): AuthBootState {
  const [state, setState] = useState<AuthBootState>("checking");
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      // Distinguishes a refresh outage from a profile hiccup in the catch below.
      // Only the first is a refresh failure worth an issue.
      let refreshSucceeded = false;

      try {
        const response = await refreshTokenRequest();
        const accessToken = response.headers["x-access-token"];
        if (!accessToken) {
          // Not a normal state: the backend 401s when the cookie is missing, so
          // a 200 carrying no token means the header was lost in transit
          // (exposed-headers or proxy misconfiguration) — which breaks every
          // session silently. Reported as an unrecognised fault, which is what
          // it is: our own infrastructure answering something impossible.
          reportRefreshFailure(new Error("Token refresh answered 200 without an access token"));
          if (!cancelled) setState("unauthenticated");
          return;
        }
        refreshSucceeded = true;
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        // Re-hydrate the non-persisted profile slice (theme, tutorial, etc.).
        // A failure here is non-fatal: the token is valid, so the user is
        // authenticated even if the profile couldn't be loaded this tick.
        const profile = await getProfile();
        if (cancelled) return;
        if (profile.data) {
          hydratePerfil(dispatch, profile.data);
        }
        setState("authenticated");
      } catch (bootError) {
        // The boot path never touches the interceptor, so this was the widest
        // blast radius in the app and the only one reporting nothing: a 5xx from
        // /auth/refresh logs out every signed-in user at once. A routine 401
        // stays silent — that is just an absent or expired session.
        //
        // Scoped to the refresh itself. A profile re-fetch failure lands here
        // too, but the API client's own logger already reports it — counting it
        // again as a refresh outage would double-report and blame the wrong
        // endpoint.
        if (!refreshSucceeded) reportRefreshFailure(bootError);
        if (!cancelled) setState("unauthenticated");
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return state;
}
