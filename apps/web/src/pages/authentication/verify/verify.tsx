import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import AuthShell from "../../../components/authentication/AuthShell";
import OpenInAppButton from "../../../components/authentication/OpenInAppButton";
import { isMobileDevice } from "../../../components/utils/openInApp";

type VerifyState = "loading" | "success" | "error" | "expired";

function VerifyEmail() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const mobile = isMobileDevice();
    const [state, setState] = useState<VerifyState>("loading");
    const calledRef = useRef(false);

    const runVerify = useCallback(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        if (!token) {
            setState("error");
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8099";
        axios
            .get(`${apiUrl}/auth/verify-email`, { params: { token } })
            .then(() => setState("success"))
            .catch((err) => {
                if (err.response?.data?.message?.includes("expired")) {
                    setState("expired");
                } else {
                    setState("error");
                }
            });
    }, [token]);

    useEffect(() => {
        // The verification token is single-use. On a phone we defer verifying so
        // the "Open in app" deep link still carries a live token — the user picks
        // app vs browser. On desktop we verify immediately as before.
        if (!token) {
            setState("error");
            return;
        }
        if (mobile) return;
        runVerify();
    }, [token, mobile, runVerify]);

    return (
        <AuthShell title={t("VerifyEmailTitle")}>
            <div className="flex flex-col items-center text-center">
                    {state === "loading" && mobile && token && (
                        <div className="flex flex-col items-center w-full" data-testid="verify-choose">
                            <h1 className="text-2xl font-bold mb-6">{t("VerifyEmailSuccessTitle")}</h1>
                            <OpenInAppButton path="verify" token={token} />
                            <button
                                type="button"
                                onClick={runVerify}
                                className="text-accent underline text-lg mt-2"
                                data-testid="verify-in-browser"
                            >
                                {t("VerifyInBrowser")}
                            </button>
                        </div>
                    )}

                    {state === "loading" && !(mobile && token) && (
                        <>
                            <div className="w-12 h-12 border-4 border-border border-t-transparent rounded-full animate-spin mb-6" />
                            <p className="text-xl text-text/70">{t("VerifyEmailLoading")}</p>
                        </>
                    )}

                    {state === "success" && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t("VerifyEmailSuccessTitle")}</h1>
                            <p className="text-base text-text/70 mb-8">{t("VerifyEmailSuccessMessage")}</p>
                            <Link
                                to="/"
                                className="px-8 py-3 bg-accent text-white rounded-card font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("Enter")}
                            </Link>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t("VerifyEmailErrorTitle")}</h1>
                            <p className="text-base text-text/70 mb-8">{t("VerifyEmailErrorMessage")}</p>
                            <Link
                                to="/"
                                className="px-8 py-3 bg-accent text-white rounded-card font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("Enter")}
                            </Link>
                        </>
                    )}

                    {state === "expired" && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t("VerifyEmailExpiredTitle")}</h1>
                            <p className="text-base text-text/70 mb-8">{t("VerifyEmailExpiredMessage")}</p>
                            <Link
                                to="/register"
                                className="px-8 py-3 bg-accent text-white rounded-card font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("ToRegister")}
                            </Link>
                        </>
                    )}
            </div>
        </AuthShell>
    );
}

export default VerifyEmail;
