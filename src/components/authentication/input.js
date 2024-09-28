import { useState } from "react";

function Input({icon1, placeholder, inputType, icon2, icon3, iconAlt, seePasswordAlt}){
    const [InputType, setInputType] = useState(inputType);

    const [seePassword, setSeePassword] = useState(icon2);

    const handlePasswordType = (e) => {
        if(InputType === "password"){
            setInputType("text");
            setSeePassword(icon3);
        }else{
            setInputType("password");
            setSeePassword(icon2);
        }
    }

    return(
        <label className="flex border-2 border-solid border-blueMain rounded-md w-[90vw] lg:w-[100%] h-[64px]">
            <img className="w-[35px] m-2" 
            src={icon1}
            alt={iconAlt}/>

            <input
            type={InputType}
            placeholder={placeholder}
            className="w-[100%] lg2:w-[400px] lg:w-[300px] text-2xl sm:text-3xl ml-5 rounded-md focus:outline-none"/>

            <img onClick={handlePasswordType}
            className={`${icon2 || icon3 ? "block mx-4" : "hidden"} w-[35px] cursor-pointer`}
            src={seePassword}
            alt={seePasswordAlt}/>
        </label>
    )
}

export default Input;