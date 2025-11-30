import { TFunction } from "i18next";
import { useRef } from "react";

type chooseInputProps = {
    choosedLevel: number,
    error: string,
    name: string,
    setLevel: React.Dispatch<React.SetStateAction<number>>
    levels: string[],
    title: string,
    t: TFunction
}

function ChooseInput({choosedLevel, error, name, setLevel, levels, title, t}: chooseInputProps){
    const labelCss = "text-2xl md:text-xl text-secondary";
    const radioRef = useRef<HTMLInputElement>(null);

    const handleClick = (value: number) => {
        if (choosedLevel === value) {
            setLevel(0);
        } else {
            setLevel(value);
        }
    };
    
    return(
        <>
            <div className="flex flex-col items-center mt-3 md:w-full text-secondary">
                <label htmlFor={levels[0]} 
                className={labelCss}>{t(`${title}`)}</label>
                <p className='text-error text-lg underline'>{error}</p>
                <div className="flex flex-row items-center justify-evenly w-[80vw] md:w-[300px] lg:w-[250px] mt-2">
                    {levels.map((level, index) => (
                        <div key={level}
                        className="flex flex-col items-center cursor-pointer w-[60px]">
                            <input
                            type="radio"
                            ref={radioRef}
                            checked={choosedLevel === (index + 1)}
                            onChange=
                            {() => {}}
                            name={name}
                            id={level}
                            value={index + 1}
                            onClick={() => handleClick(index + 1)}
                            className="border-0 w-full h-[25px] md:h-[35px] outline-none accent-primary bg-background" />
                            <label htmlFor={level}
                            
                            className={`${choosedLevel === (index + 1) ? "text-primary" : "text-secondary"}`}>{level}</label>
                        </div>
                    ))}
                    
                </div>
            </div>
        </>
    )
}

export default ChooseInput;
