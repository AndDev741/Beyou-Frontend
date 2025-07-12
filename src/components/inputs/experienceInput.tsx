import { TFunction } from "i18next";

type experienceInputProps= {
    experience: number,
    setExperience: React.Dispatch<React.SetStateAction<number>>,
    experienceError: string,
    t: TFunction
}

function ExperienceInput({experience, setExperience, experienceError, t}: experienceInputProps){
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[45vw] h-[50px] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl";
    return(
        <>
            <label htmlFor='experience' 
            className={`${labelCss} mt-2`}>{t('YourExperience')}</label>
            <p className='text-red-500 text-lg'>{experienceError}</p>
            <select id='experience'
            name='experience'
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
            className={`${borderCss} ${experienceError ? "border-red-500" : ""}} h-[50px] text-xl pl-1 outline-none`}>
                <option value={0}>{t("Begginer")}</option>
                <option value={1}>{t('Intermediary')}</option>
                <option value={2}>{t('Advanced')}</option>
            </select>
        </>
    )
}

export default ExperienceInput;