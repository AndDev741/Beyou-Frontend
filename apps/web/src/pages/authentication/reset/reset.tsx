// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import OpenInAppButton from "../../../components/authentication/OpenInAppButton";
// Functions
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
// Services
import validateResetTokenRequest from "../../../services/authentication/request/validateResetTokenRequest";
import resetPasswordRequest from "../../../services/authentication/request/resetPasswordRequest";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { resetPasswordSchema } from "@beyou/validation/forms/authSchemas";
// Assets
import PasswordIcon from "../../../assets/authentication/passwordIcon.svg?react";
import EyeOpenIcon from "../../../assets/authentication/eyeOpen.svg?react";
import EyeClosedIcon from "../../../assets/authentication/eyeClosed.svg?react";

type ResetPasswordFormValues = {
    password: string;
    confirmPassword: string;
};

function ResetPassword() {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema(t)),
        mode: "onBlur",
        defaultValues: {
            password: "",
            confirmPassword: ""
        }
    });

    useEffect(() => {
        let isMounted = true;
        const validateToken = async () => {
            if (!token) {
                if (!isMounted) return;
                setIsTokenValid(false);
                setTokenError(t("ResetPasswordInvalid"));
                return;
            }
            if (!isMounted) return;
            setIsTokenValid(null);
            setTokenError(null);
            const response = await validateResetTokenRequest(token);
            if (!isMounted) return;
            if (response?.error) {
                setIsTokenValid(false);
                setTokenError(getFriendlyErrorMessage(t, response.error));
                return;
            }
            setIsTokenValid(true);
        };

        validateToken();
        return () => {
            isMounted = false;
        };
    }, [token, i18n.language]);

    const onSubmit = async (values: ResetPasswordFormValues) => {
        clearErrors("root");
        setSuccessMessage(null);
        if (!token) {
            setError("root", { message: t("ResetPasswordInvalid") });
            return;
        }
        if (values.password !== values.confirmPassword) {
            setError("confirmPassword", { message: t("PasswordMismatch") });
            return;
        }
        const response = await resetPasswordRequest(token, values.password);
        if (response.error) {
            const message = getFriendlyErrorMessage(t, response.error);
            if (response.error.errorKey === "PASSWORD_RESET_TOKEN_EXPIRED" || response.error.errorKey === "PASSWORD_RESET_TOKEN_INVALID") {
                setIsTokenValid(false);
                setTokenError(message);
                return;
            }
            setError("root", { message: message });
            return;
        }
        setSuccessMessage(t("PasswordResetSuccess"));
    };

    const showForm = isTokenValid === true && !successMessage;

    return (
        <AuthShell title={t("ResetPasswordTitle")} subtitle={t("ResetPasswordSubtitle")}>

                    <OpenInAppButton path="reset" token={token} />

                    {isTokenValid === null && (
                        <p className="text-center text-xl mt-6">{t("ValidatingToken")}</p>
                    )}

                    {isTokenValid === false && tokenError && (
                        <div className="flex flex-col items-center mt-6">
                            <p className="text-danger text-center text-xl mb-4">{tokenError}</p>
                            <Link to="/forgot-password" className="text-accent underline text-lg">
                                {t("ForgotPassword")}
                            </Link>
                        </div>
                    )}

                    {showForm && (
                        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
                            <Controller
                                key={"password"}
                                control={control}
                                name="password"
                                render={({ field }) => (
                                    <Input
                                        icon1={PasswordIcon}
                                        placeholder={t("PasswordPlaceholder")}
                                        inputType={"password"}
                                        icon2={EyeClosedIcon}
                                        icon3={EyeOpenIcon}
                                        seePasswordIconAlt={t("EyeToSeePassword")}
                                        data={field.value}
                                        setData={field.onChange}
                                        errorMessage={errors.password?.message ?? ""}
                                    />
                                )}
                            />

                            <div className="my-6 lg:my-3"></div>

                            <Controller
                                key={"confirmPassword"}
                                control={control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <Input
                                        icon1={PasswordIcon}
                                        placeholder={t("ConfirmPasswordPlaceholder")}
                                        inputType={"password"}
                                        icon2={EyeClosedIcon}
                                        icon3={EyeOpenIcon}
                                        seePasswordIconAlt={t("EyeToSeePassword")}
                                        data={field.value}
                                        setData={field.onChange}
                                        errorMessage={errors.confirmPassword?.message ?? ""}
                                    />
                                )}
                            />

                            <div className="mt-8 lg:mt-4">
                                <Button text={t("ResetPasswordTitle")} mode="primary" size="big" className="w-full" type="submit" />
                            </div>
                        </form>
                    )}

                    {errors.root?.message && (
                        <p className="text-danger text-center underline text-xl mb-2">{errors.root?.message}</p>
                    )}

                    {successMessage && (
                        <div className="flex flex-col items-center mt-4">
                            <p className="text-accent text-center text-xl mb-4">{successMessage}</p>
                            <Link to="/" className="text-accent underline text-lg">
                                {t("Login")}
                            </Link>
                        </div>
                    )}
        </AuthShell>
    );
}

export default ResetPassword;
