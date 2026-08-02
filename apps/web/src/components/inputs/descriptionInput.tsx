import { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { FIELD_ERROR, FIELD_LABEL, FIELD_WIDTH, fieldControl } from "./fieldStyles";

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

    const errorId = "description-error";
    return(
        <div className="flex flex-col">
            <label htmlFor='description' className={FIELD_LABEL}>
                {t('Description')}
            </label>
            <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                name="description"
                placeholder={t(`${placeholder}`)}
                aria-invalid={descriptionError ? true : undefined}
                aria-describedby={descriptionError ? errorId : undefined}
                className={`${fieldControl(!!descriptionError)} ${FIELD_WIDTH} p-3`}
                style={{
                    minHeight: minH ? `${minH}px` : undefined,
                    height: minH ? `${minH}px` : undefined,
                    ...(minHSmallScreen && !matches && {
                    minHeight: `${minHSmallScreen}px`,
                    height: `${minHSmallScreen}px`,

                    })
                }}
            />
            {descriptionError ? <p id={errorId} className={`${FIELD_ERROR} ${FIELD_WIDTH}`} title={descriptionError}>{descriptionError}</p> : null}
        </div>
    )
}

export default DescriptionInput;
