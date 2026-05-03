import { useEffect, useState } from "react";
import axios from "../services/axiosConfig";
import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";

export type AuthBootState = "checking" | "authenticated" | "unauthenticated";

/**
 * Silent token refresh on app boot.
 *
 * The JWT access token lives only in-memory (axios defaults), so a page refresh
 * loses it. The httpOnly refresh cookie survives the reload, so we can trade it
 * for a fresh access token before mounting routes — preventing the flash of 401s
 * that would otherwise fire from every component's mount effect.
 *
 * - "checking"       — refresh in flight, show a loader
 * - "authenticated"  — access token restored, safe to mount routes
 * - "unauthenticated" — no valid refresh cookie, routes/guards will redirect to /
 */
export function useSilentRefresh(): AuthBootState {
  const [state, setState] = useState<AuthBootState>("checking");

  useEffect(() => {
    let cancelled = false;

    refreshTokenRequest()
      .then((response) => {
        if (cancelled) return;
        const accessToken = response.headers["x-access-token"];
        if (accessToken) {
          axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          setState("authenticated");
        } else {
          setState("unauthenticated");
        }
      })
      .catch(() => {
        if (!cancelled) setState("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
