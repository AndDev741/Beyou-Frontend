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
    const labelCss = "text-2xl md:text-xl text-text";
    const radioRef = useRef<HTMLInputElement>(null);
    const errorCss = "text-danger text-sm leading-snug break-words whitespace-normal max-w-[45vw] md:max-w-[320px] lg:max-w-[15rem] mt-1 underline";

    const handleClick = (value: number) => {
        if (choosedLevel === value) {
            setLevel(0);
        } else {
            setLevel(value);
        }
    };
    
    return(
        <>
            <div className="flex flex-col items-center mt-3 text-text">
                <label htmlFor={levels[0]} 
                className={labelCss}>{t(`${title}`)}</label>
                {error ? <p className={errorCss} title={error}>{error}</p> : null}
                <div className="flex flex-row items-center justify-evenly w-[80vw] md:w-[300px] lg:w-[250px] mt-2">
                    {levels.map((level, index) => (
                        <div key={level}
                        className="flex flex-col items-center justify-center cursor-pointer w-[60px] min-h-[48px]">
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
                            className="border-0 w-full h-10 md:h-[35px] outline-none accent-primary bg-surface cursor-pointer" />
                            <label htmlFor={level}

                            className={`cursor-pointer py-1 ${choosedLevel === (index + 1) ? "text-accent" : "text-text"}`}>{level}</label>
                        </div>
                    ))}
                    
                </div>
            </div>
        </>
    )
}

export default ChooseInput;
