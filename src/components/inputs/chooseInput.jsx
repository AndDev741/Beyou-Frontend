import { act, useEffect, useState } from "react";

function ChooseInput({choosedLevel, error, name, setLevel, levels, title, t}){
    const labelCss = "text-2xl md:text-xl";

    console.log(choosedLevel)

    return(
        <>
            <div className="flex flex-col items-center mt-3 md:w-full">
                <label htmlFor='importance' 
                className={labelCss}>{t(`${title}`)}</label>
                <p className='text-red-500 text-lg underline'>{error}</p>
                <div className="flex flex-row items-center justify-evenly w-full mt-2">
                    {levels.map((level, index) => (
                        <div key={level}
                        className="flex flex-col items-center cursor-pointer">
                            <input checked={choosedLevel === index + 1}
                            type="radio"
                            onChange=
                            {(e) => setLevel(e.target.value)}
                            name={name}
                            id={level}
                            value={index + 1}
                            className="border-0 w-full h-[20px] outline-none" />
                            <label htmlFor={level}
                            className={`${choosedLevel === index + 1 ? "text-blueMain" : ""}`}>{level}</label>
                        </div>
                    ))}
                    
                </div>
            </div>
        </>
    )
}

export default ChooseInput;

