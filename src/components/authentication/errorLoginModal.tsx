import { useTranslation } from "react-i18next";
import errorIcon from '../../assets/errorIcon.svg'
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
import { RootState } from "../../redux/rootReducer";

function ErrorLoginModal(){
    const dispatch = useDispatch();
    const {t} = useTranslation();
    const errorMessage = useSelector((state: RootState) => state.errorHandler.defaultError);
    useEffect(() => {
        const deleteModal = setTimeout(() => {
            dispatch(defaultErrorEnter(""));
        }, 8000)

        return () => clearTimeout(deleteModal);
    }, [errorMessage, dispatch])
    
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