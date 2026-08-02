// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import GoogleIcon from "../../../components/authentication/googleIcon";
import PasswordHints from "../../../components/authentication/PasswordHints";
// Functions
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Services
import handleRegister from "../../../services/authentication/handleRegister";
import { registerSchema } from "@beyou/validation/forms/authSchemas";
// Assets
import PersonIcon from "../../../assets/authentication/personIcon.svg?react";
import EmailIcon from "../../../assets/authentication/emailIcon.svg?react";
import PasswordIcon from "../../../assets/authentication/passwordIcon.svg?react";
import EyeOpenIcon from "../../../assets/authentication/eyeOpen.svg?react";
import EyeClosedIcon from "../../../assets/authentication/eyeClosed.svg?react";

type RegisterFormValues = {
    name: string;
    email: string;
    password: string;
};

function Register() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        control,
        handleSubmit,
        setError,
        clearErrors,
        watch,
        formState: { errors }
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema(t)),
        mode: "onBlur",
        defaultValues: {
            name: "",
            email: "",
            password: ""
        }
    });

    const passwordValue = watch("password") ?? "";

    const onSubmit = async (values: RegisterFormValues) => {
        clearErrors("root");
        const errorMessage = await handleRegister(
            values.name,
            values.email,
            values.password,
            t,
            dispatch,
            navigate
        );
        if (errorMessage) {
            setError("root", { message: errorMessage });
            if (errorMessage === t("EmailInUseError")) {
                setError("email", { message: errorMessage });
            }
        }
    };

    return (
        <AuthShell
            title={`${t("Welcome")} ${t("To")} beyou`}
            subtitle={t("RegisterSubtitle")}
            footer={
                <>
                    {t("AlreadyHaveAccountShort")}{" "}
                    <Link to="/" className="font-semibold text-accent hover:underline">
                        {t("Login")}
                    </Link>
                </>
            }
        >

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
                        <Controller
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <Input
                                    icon1={PersonIcon}
                                    icon2={null}
                                    icon3={null}
                                    seePasswordIconAlt={""}
                                    label={t("Name")}
                                    placeholder={t("NamePlaceholder")}
                                    inputType={"text"}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.name?.message ?? ""}
                                    testId="register-name-input"
                                />
                            )}
                        />


                        <Controller
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <Input
                                    icon1={EmailIcon}
                                    icon2={null}
                                    icon3={null}
                                    seePasswordIconAlt=""
                                    placeholder={t("EmailPlaceholder")}
                                    inputType="text"
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.email?.message ?? ""}
                                    testId="register-email-input"
                                />
                            )}
                        />


                        <Controller
                            control={control}
                            name="password"
                            render={({ field }) => (
                                <Input
                                    icon1={PasswordIcon}
                                    placeholder={t("PasswordPlaceholder")}
                                    inputType="password"
                                    icon2={EyeClosedIcon}
                                    icon3={EyeOpenIcon}
                                    seePasswordIconAlt={t("EyeToSeePassword")}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.password?.message ?? ""}
                                    testId="register-password-input"
                                />
                            )}
                        />
                        <PasswordHints password={passwordValue} />

                        <div className="mt-2">
                            <Button
                                text={t("ToRegister")}
                                mode="primary"
                                size="big"
                                type="submit"
                                testId="register-submit"
                                className="w-full"
                            />
                        </div>
                        {errors.root?.message && (
                            <p className="block text-danger underline text-xl text-center">{errors.root?.message}</p>
                        )}
                    </form>

                    <GoogleIcon />
        </AuthShell>
    );
}

export default Register;
