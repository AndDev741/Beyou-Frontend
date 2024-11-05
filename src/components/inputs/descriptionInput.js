function DescriptionInput({description, setDescription, descriptionError, t}){
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[90vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-blueMain text-2xl md:text-xl";
    return(
        <>
            <label htmlFor='description' 
            className={`${labelCss} mt-2`}>
                {t('Description')}
            </label>
            <p className='text-red-500 text-lg'>{descriptionError}</p>
            <textarea id='description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            name='description'
            placeholder={t('DescriptionPlaceholder')}
            className={`${borderCss} ${descriptionError ? "border-red-500" : ""} outline-none text-lg p-1 min-h-[84px] lg:min-h-[100px]`}
            />
        </>
    )
}

export default DescriptionInput;