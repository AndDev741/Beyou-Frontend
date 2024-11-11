function GenericInput({t, nameError, name, setData, data, placeholder}){
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[90vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl mt-2";
    return(
        <>
            <label htmlFor={`data`} 
            className={labelCss}>{t(`${name}`)}</label>
            <p className='text-red-500 text-lg'>{nameError}</p>
            <input
            value={data}
            onChange={(e) => setData(e.target.value)}
            name={`data`} 
            id={`data`} 
            placeholder={t(`${placeholder}`)}
            className={`${borderCss} ${nameError ? "border-red-500" : ""} h-[40px] outline-none pl-2 text-lg`}/>
        </>
    )
}

export default GenericInput;