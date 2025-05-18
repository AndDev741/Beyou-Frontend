import { TFunction } from "i18next";
import { IconObject } from "../../types/icons/IconObject";
import { useEffect, useState } from "react";
import iconRender from "../icons/iconsRender";

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

    const borderCss = "border-solid border-[1px] border-blueMain rounded w-[45vw] h-[100px] md:w-[160px] lg:w-[7rem]";
    const labelCss = "text-base md:text-sm";
    return (
        <>
            <div className='flex items-center justify-start'>
                <label htmlFor='icon-small' className={labelCss}>
                    {t('Icon')}
                </label>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    name='icon-small'
                    className='w-[110px] md:w-[90px] ml-1 pl-1 border-[1px] rounded outline-none text-xs'
                    placeholder={t('IconPlaceholder')}
                />
            </div>
            <p className='text-red-500 text-xs'>{iconError}</p>
            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-red-500" : ""} min-h-[180px] ${minLgH ? `md:min-h-[${minLgH}px]` : "md:min-h-[100px]"} p-1`}
            >
                {icons.map((icon) => (
                    <span
                        onClick={() => setSelectedIcon(icon.name)}
                        key={icon.name}
                        className={`${icon.name === selectedIcon
                            ? "scale-110 text-blueMain border border-blueMain rounded"
                            : "text-gray-500"
                            } text-3xl m-1 hover:text-blueMain hover:scale-105 cursor-pointer`}
                    >
                        <icon.IconComponent />
                    </span>
                ))}
            </div>
        </>
    );
}

export default IconsBoxSmall;