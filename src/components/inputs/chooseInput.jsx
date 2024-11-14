function ChooseInput({choosedLevel, error, name, setLevel, levels, title, t}){
    const labelCss = "text-2xl md:text-xl";
    return(
        <>
            <div className="flex flex-col items-center mt-3 md:w-full">
                <label htmlFor='importance' 
                className={labelCss}>{t(`${title}`)}</label>
                <p className='text-red-500 text-lg underline'>{error}</p>
                <div className="flex flex-row items-center justify-evenly w-full mt-2">
                    {levels.map((level) => (
                        <div key={level}
                        className="flex flex-col items-center cursor-pointer">
                            <input type="radio"
                            onChange={(e) => setLevel(e.target.value)}
                            name={name}
                            id={level}
                            value={level}
                            className="border-0 w-full h-[20px] outline-none" />
                            <label htmlFor={level}
                            className={`${choosedLevel === level ? "text-blueMain" : ""}`}>{level}</label>
                        </div>
                    ))}
                    
                </div>
            </div>
        </>
    )
}

export default ChooseInput;

