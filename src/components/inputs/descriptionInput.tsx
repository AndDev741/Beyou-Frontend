import { TFunction } from "i18next";
import { useEffect, useState } from "react";

type descriptionInputProps = {
    description: string,
    setDescription: React.Dispatch<React.SetStateAction<string>>,
    placeholder: string,
    descriptionError: string,
    minH: number,
    minHSmallScreen?: number,
    t: TFunction
}
function DescriptionInput({description, setDescription, placeholder, descriptionError, minH, minHSmallScreen, t}: descriptionInputProps){
    const [matches, setMatches] = useState(
        window.matchMedia("(min-width: 768px)").matches
    )

    useEffect(() => {
        window
        .matchMedia("(min-width: 768px)")
        .addEventListener('change', e => setMatches( e.matches ));
    }, []);

    const borderCss = `border border-primary rounded-md w-[45vw] ${minHSmallScreen ? `min-h-[${minHSmallScreen}px] h-[${minHSmallScreen}px]` : ""} md:w-[320px] lg:w-[15rem]`;
    const labelCss = "text-2xl md:text-xl text-secondary";
    return(
        <>
            <div className="flex flex-col">
                <label htmlFor='description' 
                className={`${labelCss} mt-2`}>
                    {t('Description')}
                </label>
                <p className='text-error text-lg'>{descriptionError}</p>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    name="description"
                    placeholder={t(`${placeholder}`)}
                    className={`${borderCss} ${descriptionError ? "border-error" : ""} outline-none text-lg p-1 bg-background text-secondary placeholder:text-placeholder transition-colors duration-200`}
                    style={{
                        minHeight: minH ? `${minH}px` : undefined,
                        height: minH ? `${minH}px` : undefined,
                        ...(minHSmallScreen && !matches && {
                        minHeight: `${minHSmallScreen}px`,
                        height: `${minHSmallScreen}px`,
                        
                        })
                    }}
                />
            </div>
        </>
    )
}

export default DescriptionInput;
