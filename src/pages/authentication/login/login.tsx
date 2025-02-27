import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import TranslationButton from "../../../components/translationButton";
import SuccessRegisterPhrase from "../../../components/authentication/successRegisterPhrase";
import ErrorLoginModal from "../../../components/authentication/errorLoginModal";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { successRegisterEnter } from "../../../redux/authentication/registerSlice";
import { idEnter, nameEnter, emailEnter, phraseEnter, phraseAuthorEnter, constaceEnter, photoEnter, isGoogleAccountEnter } from "../../../redux/dashboard/perfilSlice";
import loginRequest from "../../../services/authentication/loginRequest";
import googleRequest from "../../../services/authentication/googleRequest";
import emailIcon from '../../../assets/authentication/emailIcon.svg';
import passwordIcon from '../../../assets/authentication/passwordIcon.svg';
import eyeOpen from '../../../assets/authentication/eyeOpen.svg';
import eyeClosed from '../../../assets/authentication/eyeClosed.svg';
import GoogleIcon from "../../../components/authentication/googleIcon";
import Logo from "../../../components/authentication/logo";
import { UserType } from "../../../types/user/UserType";

function Login(){
    const {t} = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [defaultError, setDefaultError] = useState("");

    //Google Login logic handler
    const [codeUsed, setCodeUsed] = useState(false);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authCode = params.get('code');
        if(authCode && !codeUsed){
            setCodeUsed(true);

            googleRequest(authCode).then((response) => {
                if(response.successRegister){
                    dispatch(successRegisterEnter(true));
                }else if(response.success){
                    const data = response.success as UserType;
                    dispatch(idEnter(data.id));
                    dispatch(nameEnter(data.name));
                    dispatch(emailEnter(data.email));
                    dispatch(phraseEnter(data.phrase));
                    dispatch(phraseAuthorEnter(data.phrase_author));
                    dispatch(constaceEnter(data.constance));
                    dispatch(photoEnter(data.photo));
                    dispatch(isGoogleAccountEnter(data.isGoogleAccount));
                    navigate("/dashboard");
                }else if(response.error){
                    setDefaultError(t('GoogleLoginError'))
                }
            }).catch((error) => {
                console.error(t('GoogleLoginError'), error)
            })

            return () => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            }
        }
    }, [t, codeUsed, navigate, dispatch])


    const handleLogin = async (e: { preventDefault: () => void; }) => {
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
            const data = response.success as UserType;
            dispatch(idEnter(data.id));
            dispatch(nameEnter(data.name));
            dispatch(emailEnter(data.email));
            dispatch(phraseEnter(data.phrase));
            dispatch(phraseAuthorEnter(data.phrase_author));
            dispatch(constaceEnter(data.constance));
            dispatch(photoEnter(data.photo));
            dispatch(isGoogleAccountEnter(data.isGoogleAccount));
            
            navigate("/dashboard");
        }
    }

    return(
        <div className="min-h-[100vh] lg:flex items-center justify-center">
            <div className="hidden lg:flex flex-col items-center justify-center -4 lg:w-[45vw] lg:min-h-[95vh] bg-blueMain rounded-l-md">
                <Logo/>
            </div>
            
            <div className="lg:w-[45vw] lg:min-h-[95vh]  lg:border-solid lg:border-2 border-blueMain lg:rounded-r-md">
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
                        icon2={null}
                        icon3={null}
                        placeholder={"email@gmail.com"} 
                        inputType={"text"} 
                        seePasswordIconAlt={""}
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
                        seePasswordIconAlt={t('EyeToSeePassword')}
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