// Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import GoogleIcon from "../../../components/authentication/googleIcon";
import TranslationButton from "../../../components/translationButton";
import Logo from "../../../components/authentication/logo";
// Functions
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Services
import handleRegister from "../../../services/authentication/handleRegister";
import { registerSchema } from "../../../validation/forms/authSchemas";
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
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center -4 w-[45vw] min-h-[95vh] bg-primary rounded-l-md">
                <Logo />
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-2 text-secondary">
                    <h1 className="text-center text-[40px] font-bold whitespace-pre-line">
                        {t("Welcome")} {t("To")}
                        <span className="text-primary"> {t("BeYou")} </span>
                    </h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center mt-8 lg:mt-2  mb-6 lg:mb-3">
                        <Controller
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <Input
                                    icon1={PersonIcon}
                                    icon2={null}
                                    icon3={null}
                                    seePasswordIconAlt={""}
                                    placeholder={t("NamePlaceholder")}
                                    inputType={"text"}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.name?.message ?? ""}
                                />
                            )}
                        />

                        <div className="my-4 lg:mt-1"></div>

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
                                />
                            )}
                        />

                        <div className="my-4 lg:mt-1"></div>

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
                                />
                            )}
                        />

                        <div className="mt-8 lg:mt-4">
                            <Button text={t("ToRegister")} mode="create" size="big" />
                        </div>
                        {errors.root?.message && (
                            <p className="block text-error underline text-xl text-center">{errors.root?.message}</p>
                        )}
                    </form>

                    <GoogleIcon />

                    <div className="block lg:hidden py-8">
                        <TranslationButton />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Register;
