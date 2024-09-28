import Header from "../../../components/authentication/header";
import Input from "../../../components/authentication/input";
import Button from "../../../components/button";
import { useTranslation } from "react-i18next";
import personIcon from '../../../assets/authentication/personIcon.svg';
import emailIcon from '../../../assets/authentication/emailIcon.svg';
import passwordIcon from '../../../assets/authentication/passwordIcon.svg';
import eyeOpen from '../../../assets/authentication/eyeOpen.svg';
import eyeClosed from '../../../assets/authentication/eyeClosed.svg';
import GoogleIcon from "../../../components/authentication/googleIcon";
import TranslationButton from "../../../components/translationButton";
import Logo from "../../../components/authentication/logo";

function Register(){
    const {t} = useTranslation();
    return(
        <div className="min-h-[100vh] lg:flex items-center justify-center">

            <div className="hidden lg:flex flex-col items-center justify-center -4 w-[45vw] h-[600px] bg-blueMain rounded-l-md">
                <Logo/>
            </div>

            <div className="lg:w-[45vw] lg:h-[600px] lg:border-solid lg:border-2 border-blueMain lg:rounded-r-md">
                <Header />

                <main className="flex flex-col items-center mt-6 lg:mt-2">
                    <h1 className="text-center text-[40px] font-bold whitespace-pre-line">
                        {t('Welcome')} {t('To')} 
                        <span className="text-blueMain"> {t('BeYou')} </span>
                    </h1>

                    <form className="flex flex-col items-center mt-8 lg:mt-2  mb-6 lg:mb-3">

                        <Input 
                        icon1={personIcon} 
                        placeholder={t('NamePlaceholder')} 
                        inputType={"text"} 
                        iconAlt={t('EmailIconAlt')} />

                        <div className="my-4 lg:mt-1"></div>

                        <Input 
                        icon1={emailIcon} 
                        placeholder={"email@gmail.com"} inputType={"text"} 
                        iconAlt={t('EmailIconAlt')} />

                        <div className="my-4 lg:mt-1"></div>

                        <Input 
                        icon1={passwordIcon} 
                        placeholder={"xxxxxxxx"} 
                        inputType={"password"} 
                        icon2={eyeClosed} 
                        icon3={eyeOpen} 
                        iconAlt={t('PasswordIconAlt')}
                        seePasswordAlt={t('EyeToSeePassword')}/>

                        <div className="mt-8 lg:mt-4">
                            <Button text={t('ToRegister')}/>
                        </div>
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