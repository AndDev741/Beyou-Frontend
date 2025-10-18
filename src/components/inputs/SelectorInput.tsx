import { TFunction } from "i18next";

type selectorInputProps= {
    value: number | string,
    setValue: React.Dispatch<React.SetStateAction<any>>,
    errorPhrase: string,
    valuesToSelect: {
        title: string,
        value: any
    }[],
    title: string
    t: TFunction
}

function SelectorInput({value, setValue, valuesToSelect, title, errorPhrase, t}: selectorInputProps){ 
    const borderCss = "border border-primary rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl text-secondary";
    return(
        <>
            <label htmlFor='value' 
            className={`${labelCss} mt-2`}>{title}</label>
            <p className='text-error text-lg'>{errorPhrase}</p>
            <select id='value'
            name='value'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${borderCss} ${errorPhrase ? "border-error" : ""} h-[50px] text-xl pl-1 outline-none bg-background text-secondary transition-colors duration-200`}>
                {valuesToSelect.map(option => (
                    <option key={option.value} value={option.value}>{option.title}</option>
                ))}
            </select>
        </>
    )
}

export default SelectorInput;
