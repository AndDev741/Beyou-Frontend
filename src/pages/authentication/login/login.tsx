//Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import TranslationButton from "../../../components/translationButton";
import SuccessRegisterPhrase from "../../../components/authentication/successRegisterPhrase";
import ErrorLoginModal from "../../../components/authentication/errorLoginModal";
import GoogleIcon from "../../../components/authentication/googleIcon";
import Logo from "../../../components/authentication/logo";
//Functions
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
//Services
import useGoogleLogin from "../../../services/authentication/useGoogleLogin";
import handleLogin from "../../../services/authentication/useLogin";
//Assets
import { ReactComponent as EmailIcon } from "../../../assets/authentication/emailIcon.svg";
import { ReactComponent as PasswordIcon } from "../../../assets/authentication/passwordIcon.svg";
import { ReactComponent as EyeOpenIcon } from "../../../assets/authentication/eyeOpen.svg";
import { ReactComponent as EyeClosedIcon } from "../../../assets/authentication/eyeClosed.svg";

function Login(){
    const {t} = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [, setDefaultError] = useState("");

    //Google Login logic handler
    useGoogleLogin(navigate, dispatch, t, setDefaultError);
    return(
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">
            <div className="hidden lg:flex flex-col items-center justify-center -4 lg:w-[45vw] lg:min-h-[95vh] bg-primary rounded-l-md">
                <Logo/>
            </div>
            
            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header/>
                <main className="flex flex-col items-center mt-6 lg:mt-4 text-secondary">
                    <h1 className="text-center text-[40px] font-bold">
                        {t('Welcome')} 
                        <span className="text-primary"> {t('Back!')} </span>
                    </h1>

                    <div className="hidden lg:block my-2">
                        <TranslationButton/>
                    </div>

                    <form onSubmit={(e) => handleLogin(e,email, password, t, dispatch, navigate, setEmailError, setPasswordError, setDefaultError)}
                    className="flex flex-col items-center mt-8 lg:mt-5 mb-6 lg:mb-3">

                        <Input 
                        icon1={EmailIcon} 
                        icon2={null}
                        icon3={null}
                        placeholder={"email@gmail.com"} 
                        inputType={"text"} 
                        seePasswordIconAlt={""}
                        data={email}
                        setData={setEmail}
                        errorMessage={emailError} />

                        <div className="my-6 lg:my-3"></div>

                        <Input 
                        icon1={PasswordIcon} 
                        placeholder={"xxxxxxxx"} 
                        inputType={"password"} 
                        icon2={EyeClosedIcon} 
                        icon3={EyeOpenIcon} 
                        seePasswordIconAlt={t('EyeToSeePassword')}
                        data={password}
                        setData={setPassword}
                        errorMessage={passwordError}/>

                        <p className="mt-4 lg:mt-3 mb-6 lg:mb-4 text-xl text-primary underline font-medium cursor-pointer">{t('ForgotPassword')}</p>

                        <Button text={t('Enter')}/>
                        
                    </form>

                    <GoogleIcon />
                    
                    <div className="block lg:hidden my-8">
                        <TranslationButton/>
                    </div>
                    
                    <SuccessRegisterPhrase/>
                    <ErrorLoginModal />
                </main>
            </div>
        </div>
    )
}

export default Login;
