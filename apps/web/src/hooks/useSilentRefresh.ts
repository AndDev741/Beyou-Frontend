import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "../services/axiosConfig";
import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";
import getProfile from "../services/user/getProfile";
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
      try {
        const response = await refreshTokenRequest();
        const accessToken = response.headers["x-access-token"];
        if (!accessToken) {
          if (!cancelled) setState("unauthenticated");
          return;
        }
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
      } catch {
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
