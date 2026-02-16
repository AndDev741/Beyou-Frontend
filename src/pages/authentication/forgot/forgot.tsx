// Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import TranslationButton from "../../../components/translationButton";
import Logo from "../../../components/authentication/logo";
// Functions
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Services
import forgotPasswordRequest from "../../../services/authentication/request/forgotPasswordRequest";
import { getFriendlyErrorMessage } from "../../../services/apiError";
import { forgotPasswordSchema } from "../../../validation/forms/authSchemas";
// Assets
import EmailIcon from "../../../assets/authentication/emailIcon.svg?react";

type ForgotPasswordFormValues = {
    email: string;
};

function ForgotPassword() {
    const { t } = useTranslation();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema(t)),
        mode: "onBlur",
        defaultValues: {
            email: ""
        }
    });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        clearErrors("root");
        setSuccessMessage(null);
        const response = await forgotPasswordRequest(values.email);
        if (response.error) {
            const message = getFriendlyErrorMessage(t, response.error);
            setError("root", { message });
            return;
        }
        setSuccessMessage(t("PasswordResetRequestSuccess"));
    };

    return (
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center -4 lg:w-[45vw] lg:min-h-[95vh] bg-primary rounded-l-md">
                <Logo />
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-4 text-secondary">
                    <h1 className="text-center text-[36px] font-bold">
                        {t("ForgotPasswordTitle")}
                    </h1>
                    <p className="text-center text-xl mt-2 max-w-[80%]">
                        {t("ForgotPasswordSubtitle")}
                    </p>

                    <div className="hidden lg:block my-2">
                        <TranslationButton />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center mt-8 lg:mt-5 mb-6 lg:mb-3">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <Input
                                    icon1={EmailIcon}
                                    icon2={null}
                                    icon3={null}
                                    placeholder={t("EmailPlaceholder")}
                                    inputType={"text"}
                                    seePasswordIconAlt={""}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.email?.message ?? ""}
                                />
                            )}
                        />

                        <div className="mt-8 lg:mt-4">
                            <Button text={t("SendResetLink")} mode="create" size="big" />
                        </div>
                    </form>

                    {errors.root?.message && (
                        <p className="text-error text-center underline text-xl mb-2">{errors.root?.message}</p>
                    )}

                    {successMessage && (
                        <p className="text-primary text-center text-xl mb-2">{successMessage}</p>
                    )}

                    <div className="block lg:hidden my-8">
                        <TranslationButton />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default ForgotPassword;
