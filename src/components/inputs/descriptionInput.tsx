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

    const borderCss = `border-solid border-[1px] border-blueMain rounded-md w-[45vw] ${minHSmallScreen ? `min-h-[${minHSmallScreen}px] h-[${minHSmallScreen}px]` : ""} md:w-[320px] lg:w-[15rem]`;
    const labelCss = "text-2xl md:text-xl";
    return(
        <>
            <div className="flex flex-col">
                <label htmlFor='description' 
                className={`${labelCss} mt-2`}>
                    {t('Description')}
                </label>
                <p className='text-red-500 text-lg'>{descriptionError}</p>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    name="description"
                    placeholder={t(`${placeholder}`)}
                    className={`${borderCss} ${descriptionError ? "border-red-500" : ""} outline-none text-lg p-1`}
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