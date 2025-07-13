import { TFunction } from "i18next";

type genericInputProps = {
    t: TFunction,
    dataError: string,
    name: string,
    setData: React.Dispatch<React.SetStateAction<any>>,
    data: any,
    placeholder: string
}
function GenericInput({t, dataError, name, setData, data, placeholder}: genericInputProps){
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl mt-2";
    return(
        <>
            <div className="flex flex-col">
                <label htmlFor={`data`} 
                className={labelCss}>{t(`${name}`)}</label>
                <p className='text-red-500 text-lg'>{dataError}</p>
                <input
                value={data}
                onChange={(e) => setData(e.target.value)}
                name={`data`} 
                id={`data`} 
                placeholder={t(`${placeholder}`)}
                className={`${borderCss} ${dataError ? "border-red-500" : ""} h-[40px] outline-none pl-2 text-lg`}/>
            </div>
        </>
    )
}

export default GenericInput;