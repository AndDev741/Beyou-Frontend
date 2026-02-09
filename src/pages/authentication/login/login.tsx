// Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import TranslationButton from "../../../components/translationButton";
import SuccessRegisterPhrase from "../../../components/authentication/successRegisterPhrase";
import ErrorLoginModal from "../../../components/authentication/errorLoginModal";
import GoogleIcon from "../../../components/authentication/googleIcon";
import Logo from "../../../components/authentication/logo";
// Functions
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Services
import useGoogleLogin from "../../../services/authentication/useGoogleLogin";
import handleLogin from "../../../services/authentication/useLogin";
import { loginSchema } from "../../../validation/forms/authSchemas";
// Assets
import EmailIcon from "../../../assets/authentication/emailIcon.svg?react";
import PasswordIcon from "../../../assets/authentication/passwordIcon.svg?react";
import EyeOpenIcon from "../../../assets/authentication/eyeOpen.svg?react";
import EyeClosedIcon from "../../../assets/authentication/eyeClosed.svg?react";

type LoginFormValues = {
    email: string;
    password: string;
};

function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [, setDefaultError] = useState("");

    const {
        control,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema(t)),
        mode: "onBlur",
        defaultValues: {
            email: "",
            password: ""
        }
    });

    // Google Login logic handler
    useGoogleLogin(navigate, dispatch, t, setDefaultError);

    const onSubmit = async (values: LoginFormValues) => {
        clearErrors("root");
        const errorMessage = await handleLogin(values.email, values.password, t, dispatch, navigate);
        if (errorMessage) {
            setError("root", { message: errorMessage });
        }
    };

    return (
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center -4 lg:w-[45vw] lg:min-h-[95vh] bg-primary rounded-l-md">
                <Logo />
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header />
                <main className="flex flex-col items-center mt-6 lg:mt-4 text-secondary">
                    <h1 className="text-center text-[40px] font-bold">
                        {t("Welcome")}
                        <span className="text-primary"> {t("Back!")} </span>
                    </h1>

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
                                    placeholder={"email@gmail.com"}
                                    inputType={"text"}
                                    seePasswordIconAlt={""}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.email?.message ?? ""}
                                />
                            )}
                        />

                        <div className="my-6 lg:my-3"></div>

                        <Controller
                            control={control}
                            name="password"
                            render={({ field }) => (
                                <Input
                                    icon1={PasswordIcon}
                                    placeholder={"xxxxxxxx"}
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

                        <p className="mt-4 lg:mt-3 mb-6 lg:mb-4 text-xl text-primary underline font-medium cursor-pointer">
                            {t("ForgotPassword")}
                        </p>

                        <Button text={t("Enter")} mode="create" size="big" />
                    </form>

                    {errors.root?.message && (
                        <p className="text-error text-center underline text-xl mb-2">{errors.root?.message}</p>
                    )}

                    <GoogleIcon />

                    <div className="block lg:hidden my-8">
                        <TranslationButton />
                    </div>

                    <SuccessRegisterPhrase />
                    <ErrorLoginModal />
                </main>
            </div>
        </div>
    );
}

export default Login;
