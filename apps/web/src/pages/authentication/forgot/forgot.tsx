// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
// Functions
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
        <AuthShell title={t("ForgotPasswordTitle")} subtitle={t("ForgotPasswordSubtitle")}>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <Input
                                    icon1={EmailIcon}
                                    icon2={null}
                                    icon3={null}
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

                        <div className="mt-8 lg:mt-4">
                            <Button text={t("SendResetLink")} mode="primary" size="big" className="w-full" />
                        </div>
                    </form>

                    {errors.root?.message && (
                        <p className="text-danger text-center underline text-xl mb-2">{errors.root?.message}</p>
                    )}

                    {successMessage && (
                        <p className="text-accent text-center text-xl mb-2">{successMessage}</p>
                    )}
        </AuthShell>
    );
}

export default ForgotPassword;
