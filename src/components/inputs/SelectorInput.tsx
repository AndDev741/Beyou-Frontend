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
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl";
    return(
        <>
            <label htmlFor='value' 
            className={`${labelCss} mt-2`}>{title}</label>
            <p className='text-red-500 text-lg'>{errorPhrase}</p>
            <select id='value'
            name='value'
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className={`${borderCss} ${errorPhrase ? "border-red-500" : ""}} h-[50px] text-xl pl-1 outline-none`}>
                {valuesToSelect.map(value => (
                    <option value={value.value}>{value.title}</option>
                ))}
            </select>
        </>
    )
}

export default SelectorInput;