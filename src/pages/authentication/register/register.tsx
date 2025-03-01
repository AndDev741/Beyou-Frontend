//Components
import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/Button";
import GoogleIcon from "../../../components/authentication/googleIcon";
import TranslationButton from "../../../components/translationButton";
import Logo from "../../../components/authentication/logo";
//Functions
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import handleRegister from "../../../services/authentication/handleRegister";
//Assets
import personIcon from '../../../assets/authentication/personIcon.svg';
import emailIcon from '../../../assets/authentication/emailIcon.svg';
import passwordIcon from '../../../assets/authentication/passwordIcon.svg';
import eyeOpen from '../../../assets/authentication/eyeOpen.svg';
import eyeClosed from '../../../assets/authentication/eyeClosed.svg';

function Register(){
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); 

    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [defaultError, setDefaultError] = useState("");

    return(
        <div className="min-h-[100vh] lg:flex items-center justify-center">

            <div className="hidden lg:flex flex-col items-center justify-center -4 w-[45vw] min-h-[95vh] bg-blueMain rounded-l-md">
                <Logo/>
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-blueMain lg:rounded-r-md">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-2">
                    <h1 className="text-center text-[40px] font-bold whitespace-pre-line">
                        {t('Welcome')} {t('To')} 
                        <span className="text-blueMain"> {t('BeYou')} </span>
                    </h1>

                    <form onSubmit={(e) => handleRegister(e, name, email, password, t, dispatch, navigate, setNameError, setEmailError, setPasswordError, setDefaultError)}
                    className="flex flex-col items-center mt-8 lg:mt-2  mb-6 lg:mb-3">

                        <Input 
                        icon1={personIcon} 
                        icon2={null}
                        icon3={null}
                        seePasswordIconAlt={""}
                        placeholder={t('NamePlaceholder')} 
                        inputType={"text"} 
                        iconAlt={t('EmailIconAlt')}
                        data={name}
                        setData={setName}
                        errorMessage={nameError} />

                        <div className="my-4 lg:mt-1"></div>

                        <Input 
                        icon1={emailIcon} 
                        icon2={null}
                        icon3={null}
                        seePasswordIconAlt={""}
                        placeholder={"email@gmail.com"} inputType={"text"} 
                        iconAlt={t('EmailIconAlt')}
                        data={email}
                        setData={setEmail}
                        errorMessage={emailError} />

                        <div className="my-4 lg:mt-1"></div>

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

                        <div className="mt-8 lg:mt-4">
                            <Button text={t('ToRegister')}/>
                        </div>
                        <p className={`${defaultError ? "block text-red-800 underline text-xl text-center" : "hidden"}`}>{defaultError}</p>
                    </form>

                    <GoogleIcon />
                    
                    <div className="block lg:hidden my-8">
                        <TranslationButton/>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Register;