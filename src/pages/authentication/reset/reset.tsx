// Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import TranslationButton from "../../../components/translationButton";
import Logo from "../../../components/authentication/logo";
// Functions
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
// Services
import validateResetTokenRequest from "../../../services/authentication/request/validateResetTokenRequest";
import resetPasswordRequest from "../../../services/authentication/request/resetPasswordRequest";
import { getFriendlyErrorMessage } from "../../../services/apiError";
import { resetPasswordSchema } from "../../../validation/forms/authSchemas";
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
            setError("root", { message: message });
            return;
        }
        setSuccessMessage(t("PasswordResetSuccess"));
    };

    const showForm = isTokenValid === true && !successMessage;

    return (
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center -4 lg:w-[45vw] lg:min-h-[95vh] bg-primary rounded-l-md">
                <Logo />
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-4 text-secondary">
                    <h1 className="text-center text-[36px] font-bold">
                        {t("ResetPasswordTitle")}
                    </h1>
                    <p className="text-center text-xl mt-2 max-w-[80%]">
                        {t("ResetPasswordSubtitle")}
                    </p>

                    <div className="hidden lg:block my-2">
                        <TranslationButton />
                    </div>

                    {isTokenValid === null && (
                        <p className="text-center text-xl mt-6">{t("ValidatingToken")}</p>
                    )}

                    {isTokenValid === false && tokenError && (
                        <div className="flex flex-col items-center mt-6">
                            <p className="text-error text-center text-xl mb-4">{tokenError}</p>
                            <Link to="/forgot-password" className="text-primary underline text-lg">
                                {t("ForgotPassword")}
                            </Link>
                        </div>
                    )}

                    {showForm && (
                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center mt-8 lg:mt-5 mb-6 lg:mb-3">
                            <Controller
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
                                <Button text={t("ResetPasswordTitle")} mode="create" size="big" type="submit" />
                            </div>
                        </form>
                    )}

                    {errors.root?.message && (
                        <p className="text-error text-center underline text-xl mb-2">{errors.root?.message}</p>
                    )}

                    {successMessage && (
                        <div className="flex flex-col items-center mt-4">
                            <p className="text-primary text-center text-xl mb-4">{successMessage}</p>
                            <Link to="/" className="text-primary underline text-lg">
                                {t("Login")}
                            </Link>
                        </div>
                    )}

                    <div className="block lg:hidden my-8">
                        <TranslationButton />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default ResetPassword;
