import { TFunction } from "i18next";

type experienceInputProps= {
    experience: number,
    setExperience: React.Dispatch<React.SetStateAction<number>>,
    experienceError: string,
    t: TFunction
}

function ExperienceInput({experience, setExperience, experienceError, t}: experienceInputProps){
    const borderCss = "border border-primary rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-lg md:text-2xl md:text-xl text-secondary";
    const errorCss = "text-error text-sm leading-snug break-words whitespace-normal max-w-full mt-1";
    return(
        <>
            <label htmlFor='experience' 
            className={`${labelCss} mt-2`}>{t('YourExperience')}</label>
            {experienceError ? <p className={errorCss} title={experienceError}>{experienceError}</p> : null}
            <select id='experience'
            name='experience'
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
            className={`${borderCss} ${experienceError ? "border-error" : ""} h-[50px] text-xl pl-1 outline-none bg-background text-secondary transition-colors duration-200`}>
                <option value={0}>{t("Begginer")}</option>
                <option value={1}>{t('Intermediary')}</option>
                <option value={2}>{t('Advanced')}</option>
            </select>
        </>
    )
}

export default ExperienceInput;
