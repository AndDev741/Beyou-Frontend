import { useState } from "react";

type InputProps = {
    icon1: string,
    placeholder: string,
    inputType: string,
    icon2: string | null,
    icon3: string | null,
    iconAlt: string,
    seePasswordIconAlt: string,
    data: string,
    setData: React.Dispatch<React.SetStateAction<string>>,
    errorMessage: string
}

function Input({icon1, placeholder, inputType, icon2, icon3, iconAlt, seePasswordIconAlt, data, setData, errorMessage}: InputProps){
    const [InputType, setInputType] = useState(inputType);
    const [seePasswordIcon, setSeePasswordIcon] = useState(icon2);

    const handlePasswordType = () => {
        if(InputType === "password"){
            setInputType("text");
            setSeePasswordIcon(icon3);
        }else{
            setInputType("password");
            setSeePasswordIcon(icon2);
        }
    }

    return(
        <>
        <label className={`flex border-2 border-solid border-blueMain rounded-md w-[90vw] lg:w-[100%] h-[64px] 
            ${errorMessage ? "border-red-600" : ""}`}>
            <img className="w-[35px] m-2 " 
            src={icon1}
            alt={iconAlt}/>

            <input
            type={InputType}
            placeholder={placeholder}
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={`w-[100%] lg2:w-[400px] lg:w-[300px] text-2xl sm:text-3xl ml-5 rounded-md focus:outline-none`}/>

            <img onClick={handlePasswordType}
            className={`${icon2 || icon3 ? "block mx-4" : "hidden"} w-[35px] cursor-pointer`}
            src={seePasswordIcon ? seePasswordIcon : ""}
            alt={seePasswordIconAlt}/>
        </label>
        <p className={`${errorMessage ? "block text-red-800 underline text-xl text-center" : "hidden"}`}>{errorMessage}</p>
        </>
    )
}

export default Input;