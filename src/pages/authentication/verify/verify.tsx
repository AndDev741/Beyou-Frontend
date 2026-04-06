import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import Logo from "../../../components/authentication/logo";

type VerifyState = "loading" | "success" | "error" | "expired";

function VerifyEmail() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [state, setState] = useState<VerifyState>("loading");

    useEffect(() => {
        const token = searchParams.get("token");
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
    }, [searchParams]);

    return (
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center w-[45vw] min-h-[95vh] bg-primary rounded-l-md">
                <Logo />
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background flex items-center justify-center">
                <div className="flex flex-col items-center px-8 py-12 max-w-[420px] text-center">
                    {state === "loading" && (
                        <>
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                            <p className="text-xl text-secondary/70">{t("VerifyEmailLoading")}</p>
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
                            <p className="text-base text-secondary/70 mb-8">{t("VerifyEmailSuccessMessage")}</p>
                            <Link
                                to="/"
                                className="px-8 py-3 bg-primary text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("Enter")}
                            </Link>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t("VerifyEmailErrorTitle")}</h1>
                            <p className="text-base text-secondary/70 mb-8">{t("VerifyEmailErrorMessage")}</p>
                            <Link
                                to="/"
                                className="px-8 py-3 bg-primary text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("Enter")}
                            </Link>
                        </>
                    )}

                    {state === "expired" && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t("VerifyEmailExpiredTitle")}</h1>
                            <p className="text-base text-secondary/70 mb-8">{t("VerifyEmailExpiredMessage")}</p>
                            <Link
                                to="/register"
                                className="px-8 py-3 bg-primary text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                {t("ToRegister")}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerifyEmail;
