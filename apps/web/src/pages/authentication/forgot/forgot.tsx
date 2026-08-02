// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import FormNotice from "../../../components/authentication/FormNotice";
// Functions
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Services
import forgotPasswordRequest from "../../../services/authentication/request/forgotPasswordRequest";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { forgotPasswordSchema } from "@beyou/validation/forms/authSchemas";
// Assets
import EmailIcon from "../../../assets/authentication/emailIcon.svg?react";
import { Loader } from "lucide-react";

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
        formState: { errors, isSubmitting }
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
        <AuthShell
            title={t("ForgotPasswordTitle")}
            subtitle={t("ForgotPasswordSubtitle")}
            footer={
                <Link to="/" className="font-semibold text-accent hover:underline">
                    {t("BackToLogin")}
                </Link>
            }
        >

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <Input
                                    icon1={EmailIcon}
                                    icon2={null}
                                    icon3={null}
                                    label={t("Email")}
                                    placeholder={t("EmailPlaceholder")}
                                    inputType={"email"}
                                    seePasswordIconAlt={""}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.email?.message ?? ""}
                                    autoComplete="email"
                                />
                            )}
                        />

                        {/* O botão some do estado "clicável" enquanto a
                            requisição corre: sem isso dava para disparar o
                            e-mail várias vezes sem nenhum sinal de que algo
                            estava acontecendo. */}
                        <Button
                            text={isSubmitting ? t("Sending") : t("SendResetLink")}
                            mode="primary"
                            size="big"
                            type="submit"
                            className="mt-2 w-full"
                            disabled={isSubmitting}
                            icon={isSubmitting ? <Loader size={15} className="animate-spin" /> : undefined}
                        />

                        {errors.root?.message && <FormNotice tone="error" message={errors.root.message} />}

                        {successMessage && (
                            <FormNotice
                                tone="success"
                                title={t("PasswordResetRequestSentTitle")}
                                message={successMessage}
                            />
                        )}
                    </form>
        </AuthShell>
    );
}

export default ForgotPassword;
