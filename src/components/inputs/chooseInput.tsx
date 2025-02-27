import { TFunction } from "i18next";

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
    const labelCss = "text-2xl md:text-xl";
    return(
        <>
            <div className="flex flex-col items-center mt-3 md:w-full">
                <label htmlFor='importance' 
                className={labelCss}>{t(`${title}`)}</label>
                <p className='text-red-500 text-lg underline'>{error}</p>
                <div className="flex flex-row items-center justify-evenly w-[80vw] md:w-[300px] lg:w-[250px] mt-2">
                    {levels.map((level, index) => (
                        <div key={level}
                        className="flex flex-col items-center cursor-pointer w-[60px]">
                            <input
                            type="radio"
                            checked={choosedLevel === (index + 1)}
                            onChange=
                            {(e) => setLevel(Number(e.target.value))}
                            name={name}
                            id={level}
                            value={index + 1}
                            className="border-0 w-full h-[20px] md:h-[35px]  outline-none" />
                            <label htmlFor={level}
                            
                            className={`${choosedLevel === (index + 1) ? "text-blueMain" : ""}`}>{level}</label>
                        </div>
                    ))}
                    
                </div>
            </div>
        </>
    )
}

export default ChooseInput;

