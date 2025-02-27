import { useTranslation } from "react-i18next";
import errorIcon from '../../assets/errorIcon.svg'
import { useEffect } from "react";

function ErrorLoginModal({errorMessage, setErrorMessage}: {
    errorMessage: string,
    setErrorMessage: React.Dispatch<React.SetStateAction<string>>
}){
    
    const {t} = useTranslation();
    useEffect(() => {
        const deleteModal = setTimeout(() => {
            setErrorMessage("");
        }, 8000)

        return () => clearTimeout(deleteModal);
    }, [errorMessage, setErrorMessage])
    
    return(
        <div className={`${errorMessage !== "" ? "flex items-center justify-center absolute w-[100vw] lg:w-[400px] h-[110px] lg:h-[100px] lg:rounded-md border-b-2 border-solid border-blueMain bg-white top-0 lg:top-10 lg:left-[80px] text-red-700" 
        : "hidden"}`}>
            <img className="w-[50px] mx-3 animate-bounce"
            src={errorIcon}
            alt={t('ErrorIconAlt')}/>
            <p className="text-2xl font-semibold m-2">{errorMessage}</p>
        </div>
    )
}

export default ErrorLoginModal;