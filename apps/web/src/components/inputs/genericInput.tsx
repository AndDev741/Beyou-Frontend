import { TFunction } from "i18next";
import { FIELD_ERROR, FIELD_LABEL, FIELD_WIDTH, fieldControl } from "./fieldStyles";

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
    const errorId = `${name}-error`;
    return(
        <div className="flex flex-col">
            <label htmlFor={name} className={FIELD_LABEL}>{t(`${name}`)}</label>
            <input
            value={data}
            type={type}
            onChange={(e) => setData(e.target.value)}
            name={name}
            id={name}
            placeholder={t(`${placeholder}`)}
            aria-invalid={dataError ? true : undefined}
            aria-describedby={dataError ? errorId : undefined}
            className={`${fieldControl(!!dataError)} ${FIELD_WIDTH} h-11 px-3`}
            />
            {dataError ? <p id={errorId} className={`${FIELD_ERROR} ${FIELD_WIDTH}`} title={dataError}>{dataError}</p> : null}
        </div>
    )
}

export default GenericInput;
