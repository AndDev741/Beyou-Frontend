import { TFunction } from "i18next";
import SegmentedControl from "../../ui/SegmentedControl";
import { FIELD_ERROR, FIELD_LABEL } from "./fieldStyles";

type chooseInputProps = {
    choosedLevel: number,
    error: string,
    name: string,
    setLevel: React.Dispatch<React.SetStateAction<number>>
    levels: string[],
    title: string,
    t: TFunction
}

function ChooseInput({choosedLevel, error, name, setLevel, levels, title, t}: chooseInputProps){
    const label = t(`${title}`);
    const errorId = `${name}-error`;

    // Clicking the level already chosen clears it — the old radio's behaviour.
    const handleChange = (value: number) => {
        if (choosedLevel === value) {
            setLevel(0);
        } else {
            setLevel(value);
        }
    };

    return(
        <div className="mt-3 flex w-[80vw] flex-col md:w-[300px] lg:w-[250px]">
            <span className={FIELD_LABEL}>{label}</span>
            <SegmentedControl
                options={levels.map((level, index) => ({ value: index + 1, label: level }))}
                value={choosedLevel}
                onChange={handleChange}
                label={label}
                size="sm"
                className={`w-full ${error ? "ring-1 ring-danger" : ""}`}
            />
            {error ? <p id={errorId} className={FIELD_ERROR} title={error}>{error}</p> : null}
        </div>
    )
}

export default ChooseInput;
