import { TFunction } from "i18next";

type genericInputProps = {
    t: TFunction,
    type?: string,
    dataError: string,
    name: string,
    setData: React.Dispatch<React.SetStateAction<any>>,
    data: any,
    placeholder: string
}
function GenericInput({t, dataError, name, setData, data, placeholder, type = "text"}: genericInputProps){
    const borderCss = "border border-primary rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem] bg-background text-secondary placeholder:text-placeholder transition-colors duration-200";
    const labelCss = "text-2xl md:text-xl mt-2 text-secondary";
    return(
        <>
            <div className="flex flex-col">
                <label htmlFor={`data`} 
                className={labelCss}>{t(`${name}`)}</label>
                <p className='text-error text-lg'>{dataError}</p>
                <input
                value={data}
                type={type}
                onChange={(e) => setData(e.target.value)}
                name={`data`} 
                id={`data`} 
                placeholder={t(`${placeholder}`)}
                className={`${borderCss} ${dataError ? "border-error" : ""} h-[40px] outline-none pl-2 text-lg`}
                />
            </div>
        </>
    )
}

export default GenericInput;
