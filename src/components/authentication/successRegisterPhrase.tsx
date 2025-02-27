import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import checkIcon from '../../assets/checkIcon.svg'
import { useEffect } from "react";
import { successRegisterEnter } from "../../redux/authentication/registerSlice";
import { RootState } from "../../redux/rootReducer";

function SuccessRegisterPhrase(){
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const successRegister = useSelector((state: RootState) => state.register.successRegister);

    
    useEffect(() => {
        const deleteModal = setTimeout(() => {
            dispatch(successRegisterEnter(false));
        }, 8000)

        return () => clearTimeout(deleteModal);
    }, [successRegister, dispatch])
    
    return(
        <div className={`${successRegister === true ? "flex items-center justify-center absolute w-[100vw] lg:w-[450px] h-[110px] lg:h-[100px] lg:rounded-md border-b-2 border-solid border-blueMain bg-white top-0 lg:top-10 lg:left-[80px]" 
        : "hidden"}`}>
            <img className="w-[50px] mx-3 animate-bounce"
            src={checkIcon}
            alt={t('CheckIconAlt')}/>
            <p className="text-2xl font-semibold m-2">{t('SuccessRegisterPhrase')}</p>
        </div>
    )
}

export default SuccessRegisterPhrase;