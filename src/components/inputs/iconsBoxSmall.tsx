import { TFunction } from "i18next";
import { IconObject } from "../../types/icons/IconObject";
import { useEffect, useState } from "react";
import iconRender from "../icons/iconsRender";
import React from "react";

type IconsBoxSmallProps = {
    search: string,
    setSearch: React.Dispatch<React.SetStateAction<string>>,
    iconError: string,
    t: TFunction,
    selectedIcon: string,
    setSelectedIcon: React.Dispatch<React.SetStateAction<string>>,
    minLgH?: number,
}

function IconsBoxSmall({
    search,
    setSearch,
    iconError,
    t,
    selectedIcon,
    setSelectedIcon,
    minLgH = 100,
}: IconsBoxSmallProps) {
    const [icons, setIcons] = useState<IconObject[]>([]);

    useEffect(() => {
        setIcons((icons) => iconRender(search, selectedIcon, icons));
    }, [search, selectedIcon]);

    const borderCss = "border border-primary rounded w-[45vw] h-[100px] md:h-[180px] md:w-[160px] lg:w-[12rem] bg-background";
    const labelCss = "text-base md:text-lg text-secondary";
    const errorCss = "text-error text-xs leading-snug break-words whitespace-normal max-w-full mt-1";
    return (
        <>
            <div className='flex items-center justify-start text-secondary'>
                <label htmlFor='icon-small' className={labelCss}>
                    {t('Icon')}
                </label>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    name='icon-small'
                    className='w-[110px] md:w-[90px] ml-1 pl-1 border border-primary rounded outline-none text-xs bg-background text-secondary placeholder:text-placeholder transition-colors duration-200'
                    placeholder={t('IconPlaceholder')}
                />
            </div>
            {iconError ? <p className={errorCss} title={iconError}>{iconError}</p> : null}
            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-error" : ""} min-h-[180px] ${minLgH ? `md:min-h-[${minLgH}px]` : "md:min-h-[100px]"} p-1`}
            >
                {icons.map((icon) => (
                    <span
                        onClick={() => setSelectedIcon(icon.name)}
                        key={icon.name}
                        className={`${icon.name === selectedIcon
                            ? "scale-110 text-primary border border-primary rounded"
                            : "text-description"
                            } text-3xl m-1 hover:text-primary hover:scale-105 cursor-pointer transition-all duration-150`}
                    >
                        <icon.IconComponent />
                    </span>
                ))}
            </div>
        </>
    );
}

export default React.memo(IconsBoxSmall);
