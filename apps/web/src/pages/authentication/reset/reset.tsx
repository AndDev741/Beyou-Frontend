// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import { Loader } from "lucide-react";
import FormNotice from "../../../components/authentication/FormNotice";
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
        formState: { errors, isSubmitting }
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
        <AuthShell
            title={t("ResetPasswordTitle")}
            subtitle={t("ResetPasswordSubtitle")}
            footer={
                <Link to="/" className="font-semibold text-accent hover:underline">
                    {t("BackToLogin")}
                </Link>
            }
        >

                    <OpenInAppButton path="reset" token={token} />

                    {isTokenValid === null && (
                        <FormNotice tone="loading" message={t("ValidatingToken")} className="mt-4" />
                    )}

                    {isTokenValid === false && tokenError && (
                        <div className="mt-4 flex flex-col gap-3">
                            <FormNotice tone="error" message={tokenError} />
                            <Link
                                to="/forgot-password"
                                className="text-center text-[12.5px] font-semibold text-accent hover:underline"
                            >
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
                                        label={t("NewPassword")}
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

                            <Controller
                                key={"confirmPassword"}
                                control={control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <Input
                                        icon1={PasswordIcon}
                                        label={t("ConfirmPassword")}
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

                            <Button
                                text={isSubmitting ? t("Sending") : t("ResetPasswordTitle")}
                                mode="primary"
                                size="big"
                                className="mt-2 w-full"
                                type="submit"
                                disabled={isSubmitting}
                                icon={isSubmitting ? <Loader size={15} className="animate-spin" /> : undefined}
                            />

                            {errors.root?.message && (
                                <FormNotice tone="error" message={errors.root.message} />
                            )}
                        </form>
                    )}

                    {successMessage && (
                        <div className="mt-4 flex flex-col gap-3">
                            <FormNotice tone="success" message={successMessage} />
                            <Link
                                to="/"
                                className="text-center text-[12.5px] font-semibold text-accent hover:underline"
                            >
                                {t("Login")}
                            </Link>
                        </div>
                    )}
        </AuthShell>
    );
}

export default ResetPassword;
