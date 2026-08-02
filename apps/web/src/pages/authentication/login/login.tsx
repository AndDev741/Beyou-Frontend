// Components
import AuthShell from "../../../components/authentication/AuthShell";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import FormNotice from "../../../components/authentication/FormNotice";
import GoogleIcon from "../../../components/authentication/googleIcon";
// Functions
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
// Services
import useGoogleLogin from "../../../services/authentication/useGoogleLogin";
import handleLogin from "../../../services/authentication/useLogin";
import { loginSchema } from "@beyou/validation/forms/authSchemas";
import { successRegisterEnter } from "@beyou/state/authentication/registerSlice";
import { RootState } from "@beyou/state/rootReducer";
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
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const successRegister = useSelector((state: RootState) => state.register.successRegister);

    const [searchParams] = useSearchParams();
    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const needsVerification = searchParams.get("verify") === "true";

    const {
        control,
        handleSubmit,
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
    useGoogleLogin(navigate, dispatch, t);

    useEffect(() => {
        if (!successRegister) return;
        toast.success(t("SuccessRegisterPhrase"));
        dispatch(successRegisterEnter(false));
    }, [successRegister, dispatch, i18n.language]);

    const onSubmit = async (values: LoginFormValues) => {
        clearErrors("root");
        setEmailNotVerified(false);
        const errorMessage = await handleLogin(values.email, values.password, t, dispatch, navigate);
        if (errorMessage) {
            if (errorMessage === t("EmailNotVerifiedError")) {
                setEmailNotVerified(true);
            } else {
                toast.error(errorMessage);
            }
        }
    };

    return (
        <AuthShell
            title={`${t("Welcome")} ${t("Back!")}`}
            subtitle={t("LoginSubtitle")}
            footer={
                <>
                    {t("NewHere")}{" "}
                    <Link to="/register" className="font-semibold text-accent hover:underline">
                        {t("ToRegister")}
                    </Link>
                </>
            }
        >

                    {needsVerification && (
                        <FormNotice
                            tone="success"
                            title={t("EmailVerificationSentTitle")}
                            message={t("EmailVerificationSentMessage")}
                            className="mt-4"
                        />
                    )}

                    {emailNotVerified && (
                        <FormNotice
                            tone="error"
                            title={t("EmailNotVerifiedTitle")}
                            message={t("EmailNotVerifiedMessage")}
                            className="mt-4"
                        />
                    )}

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
                                    placeholder={"email@gmail.com"}
                                    inputType={"text"}
                                    seePasswordIconAlt={""}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.email?.message ?? ""}
                                    testId="login-email-input"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="password"
                            render={({ field }) => (
                                <Input
                                    icon1={PasswordIcon}
                                    label={t("Password")}
                                    placeholder={"xxxxxxxx"}
                                    inputType={"password"}
                                    icon2={EyeClosedIcon}
                                    icon3={EyeOpenIcon}
                                    seePasswordIconAlt={t("EyeToSeePassword")}
                                    data={field.value}
                                    setData={field.onChange}
                                    errorMessage={errors.password?.message ?? ""}
                                    testId="login-password-input"
                                />
                            )}
                        />

                        <Link
                            to="/forgot-password"
                            className="-mt-1 self-end text-xs text-text-2 hover:text-accent"
                        >
                            {t("ForgotPassword")}
                        </Link>

                        <Button
                            text={t("Enter")}
                            mode="primary"
                            size="big"
                            type="submit"
                            testId="login-submit"
                            className="w-full"
                        />
                    </form>

            <GoogleIcon />
        </AuthShell>
    );
}

export default Login;
