import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/button";
import TranslationButton from "../../../components/translationButton";
import SuccessRegisterPhrase from "../../../components/authentication/successRegisterPhrase";
import ErrorLoginModal from "../../../components/authentication/errorLoginModal";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginRequest from "../../../services/authentication/loginRequest";
import emailIcon from '../../../assets/authentication/emailIcon.svg';
import passwordIcon from '../../../assets/authentication/passwordIcon.svg';
import eyeOpen from '../../../assets/authentication/eyeOpen.svg';
import eyeClosed from '../../../assets/authentication/eyeClosed.svg';
import GoogleIcon from "../../../components/authentication/googleIcon";
import Logo from "../../../components/authentication/logo";

function Login(){
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [defaultError, setDefaultError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setEmailError("");
        setPasswordError("");
        setDefaultError("");

        const response = await loginRequest(email, password, t);
        if(response.validationErrors){
            switch(response.validationErrors){
                case t('YupNecessaryEmail'):
                    setEmailError(response.validationErrors);
                    break;
                case t('YupInvalidEmail'):
                    setEmailError(t('YupInvalidEmail'));
                    break;
                case t('YupMaxLength'):
                    setDefaultError(t('YupMaxLength'));
                    break;
                case t('YupNecessaryPassword'):
                    setPasswordError(t('YupNecessaryPassword'));
                    break;
                default:
                    setDefaultError(t('UnkownError'))
            }
        }else if(response.error){
            setEmailError(t('WrongPassOrEmailError'))
            setPasswordError(" ")
            setDefaultError(t('WrongPassOrEmailError'));
        }else if(response.success){
            navigate("/dashboard");
        }
    }
    return(
        <div className="min-h-[100vh] lg:flex items-center justify-center">
            <div className="hidden lg:flex flex-col items-center justify-center -4 w-[45vw] h-[620px] bg-blueMain rounded-l-md">
                <Logo/>
            </div>
            
            <div className="lg:w-[45vw] lg:h-[620px] lg:border-solid lg:border-2 border-blueMain lg:rounded-r-md">
                <Header/>
                <main className="flex flex-col items-center mt-6 lg:mt-4">
                    <h1 className="text-center text-[40px] font-bold">{t('Welcome')} 
                        <span className="text-blueMain"> {t('Back!')} </span>
                    </h1>

                    <div className="hidden lg:block my-2">
                        <TranslationButton/>
                    </div>

                    <form onSubmit={handleLogin}
                    className="flex flex-col items-center mt-8 lg:mt-5 mb-6 lg:mb-3">

                        <Input 
                        icon1={emailIcon} 
                        placeholder={"email@gmail.com"} inputType={"text"} 
                        iconAlt={t('EmailIconAlt')}
                        data={email}
                        setData={setEmail}
                        errorMessage={emailError} />

                        <div className="my-6 lg:my-3"></div>

                        <Input 
                        icon1={passwordIcon} 
                        placeholder={"xxxxxxxx"} 
                        inputType={"password"} 
                        icon2={eyeClosed} 
                        icon3={eyeOpen} 
                        iconAlt={t('PasswordIconAlt')}
                        seePasswordAlt={t('EyeToSeePassword')}
                        data={password}
                        setData={setPassword}
                        errorMessage={passwordError}/>

                        <p className="mt-4 lg:mt-3 mb-6 lg:mb-4 text-xl text-blueMain underline font-medium cursor-pointer">{t('ForgotPassword')}</p>

                        <Button text={t('Enter')}/>
                        
                    </form>

                    <GoogleIcon />
                    
                    <div className="block lg:hidden my-8">
                        <TranslationButton/>
                    </div>
                    
                    <SuccessRegisterPhrase/>
                    <ErrorLoginModal errorMessage={defaultError} setErrorMessage={setDefaultError} />
                </main>
            </div>
        </div>
    )
}

export default Login;