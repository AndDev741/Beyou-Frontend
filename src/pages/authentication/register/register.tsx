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
import PersonIcon from "../../../assets/authentication/personIcon.svg?react";
import EmailIcon from "../../../assets/authentication/emailIcon.svg?react";
import PasswordIcon from "../../../assets/authentication/passwordIcon.svg?react";
import EyeOpenIcon from "../../../assets/authentication/eyeOpen.svg?react";
import EyeClosedIcon from "../../../assets/authentication/eyeClosed.svg?react";

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
        <div className="min-h-[100vh] lg:flex items-center justify-center bg-background text-secondary">

            <div className="hidden lg:flex flex-col items-center justify-center -4 w-[45vw] min-h-[95vh] bg-primary rounded-l-md">
                <Logo/>
            </div>

            <div className="lg:w-[45vw] lg:min-h-[95vh] lg:border-solid lg:border-2 border-primary lg:rounded-r-md bg-background">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-2 text-secondary">
                    <h1 className="text-center text-[40px] font-bold whitespace-pre-line">
                        {t('Welcome')} {t('To')} 
                        <span className="text-primary"> {t('BeYou')} </span>
                    </h1>

                    <form onSubmit={(e) => handleRegister(e, name, email, password, t, dispatch, navigate, setNameError, setEmailError, setPasswordError, setDefaultError)}
                    className="flex flex-col items-center mt-8 lg:mt-2  mb-6 lg:mb-3">

                        <Input 
                        icon1={PersonIcon} 
                        icon2={null}
                        icon3={null}
                        seePasswordIconAlt={""}
                        placeholder={t('NamePlaceholder')} 
                        inputType={"text"} 
                        data={name}
                        setData={setName}
                        errorMessage={nameError} />

                        <div className="my-4 lg:mt-1"></div>

                        <Input
                            icon1={EmailIcon}
                            icon2={null}
                            icon3={null}
                            seePasswordIconAlt=""
                            placeholder={t('EmailPlaceholder')}
                            inputType="text"
                            data={email}
                            setData={setEmail}
                            errorMessage={emailError}
                        />

                        <div className="my-4 lg:mt-1"></div>

                        <Input
                            icon1={PasswordIcon}
                            placeholder={t('PasswordPlaceholder')}
                            inputType="password"
                            icon2={EyeClosedIcon}
                            icon3={EyeOpenIcon}
                            seePasswordIconAlt={t('EyeToSeePassword')}
                            data={password}
                            setData={setPassword}
                            errorMessage={passwordError}
                        />

                        <div className="mt-8 lg:mt-4">
                            <Button text={t('ToRegister')} mode='create' size='big'/>
                        </div>
                        <p className={`${defaultError ? "block text-error underline text-xl text-center" : "hidden"}`}>{defaultError}</p>
                    </form>

                    <GoogleIcon />
                    
                    <div className="block lg:hidden py-8">
                        <TranslationButton/>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Register;
