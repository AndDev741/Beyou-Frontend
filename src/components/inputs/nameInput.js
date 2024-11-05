function NameInput({name, setName, nameError, t}){
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[90vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-blueMain text-2xl md:text-xl";
    return(
        <>
            <label htmlFor='name' 
            className={labelCss}>{t('Name')}</label>
            <p className='text-red-500 text-lg'>{nameError}</p>
            <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            name='name'
            id='name'
            placeholder={t('CategoryNamePlaceholder')}
            className={`${borderCss} ${nameError ? "border-red-500" : ""} h-[40px] outline-none pl-2 text-lg`}/>
        </>
    )
}

export default NameInput;