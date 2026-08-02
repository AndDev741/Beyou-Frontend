import { TFunction } from "i18next";
import { FIELD_ERROR, FIELD_LABEL, FIELD_WIDTH, fieldControl } from "./fieldStyles";

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

function SelectorInput({value, setValue, valuesToSelect, title, errorPhrase}: selectorInputProps){
    return(
        <div className="flex flex-col">
            <label htmlFor='value' className={FIELD_LABEL}>{title}</label>
            <select id='value'
            name='value'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={errorPhrase ? true : undefined}
            aria-describedby={errorPhrase ? "value-error" : undefined}
            className={`${fieldControl(!!errorPhrase)} ${FIELD_WIDTH} h-11 px-3`}>
                {valuesToSelect.map(option => (
                    <option key={option.value} value={option.value}>{option.title}</option>
                ))}
            </select>
            {errorPhrase ? <p id="value-error" className={`${FIELD_ERROR} ${FIELD_WIDTH}`} title={errorPhrase}>{errorPhrase}</p> : null}
        </div>
    )
}

export default SelectorInput;
