import { TFunction } from "i18next";
import SegmentedControl from "../../ui/SegmentedControl";
import { FIELD_ERROR, FIELD_LABEL, FIELD_WIDTH } from "./fieldStyles";

type experienceInputProps= {
    experience: number,
    setExperience: React.Dispatch<React.SetStateAction<number>>,
    experienceError: string,
    t: TFunction
}

function ExperienceInput({experience, setExperience, experienceError, t}: experienceInputProps){
    const label = t('YourExperience');
    return(
        <div className={`mt-2 flex flex-col ${FIELD_WIDTH}`}>
            <span className={FIELD_LABEL}>{label}</span>
            <SegmentedControl
                options={[
                    { value: 0, label: t("Beginner") },
                    { value: 1, label: t('Intermediate') },
                    { value: 2, label: t('Advanced') }
                ]}
                value={experience}
                onChange={setExperience}
                label={label}
                size="sm"
                className={`w-full ${experienceError ? "ring-1 ring-danger" : ""}`}
            />
            {experienceError ? <p id="experience-error" className={FIELD_ERROR} title={experienceError}>{experienceError}</p> : null}
        </div>
    )
}

export default ExperienceInput;
