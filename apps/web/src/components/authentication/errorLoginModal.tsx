import ErrorIcon from "../../assets/errorIcon.svg?react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
import { RootState } from "../../redux/rootReducer";

function ErrorLoginModal(){
    const dispatch = useDispatch();
    const errorMessage = useSelector((state: RootState) => state.errorHandler.defaultError);
    useEffect(() => {
        const deleteModal = setTimeout(() => {
            dispatch(defaultErrorEnter(""));
        }, 8000)

        return () => clearTimeout(deleteModal);
    }, [errorMessage, dispatch])
    
    return(
        <div className={`${errorMessage !== "" ? "flex items-center justify-center absolute w-[100vw] lg:w-[450px] h-[110px] lg:h-[100px] lg:rounded-md border-2 border-solid border-error bg-background top-0 lg:top-10 lg:left-[100px]" 
        : "hidden"}`}>
            <ErrorIcon className="w-[50px] mx-3 animate-pulse text-error" aria-hidden="true" focusable="false" />
            <p className="text-2xl font-semibold m-2 text-error">{errorMessage}</p>
        </div>
    )
}

export default ErrorLoginModal;
