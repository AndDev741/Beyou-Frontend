import { TFunction } from "i18next";
import { IconObject } from "../../types/icons/IconObject";
import { useEffect, useState, useMemo } from "react";
import iconRender from "../icons/iconsRender";
import React from "react";

type iconsInputProps = {
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    iconError: string;
    t: TFunction;
    selectedIcon: string;
    setSelectedIcon: React.Dispatch<React.SetStateAction<string>>;
    minLgH: number;
    minHSmallScreen?: number;
};

function IconsBox({
    search,
    setSearch,
    iconError,
    t,
    selectedIcon,
    setSelectedIcon,
    minLgH,
    minHSmallScreen
}: iconsInputProps) {
    const [icons, setIcons] = useState<IconObject[]>([]);
    const [matches, setMatches] = useState(
        window.matchMedia("(min-width: 768px)").matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 768px)");
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        setIcons((icons) => iconRender(search, selectedIcon, icons));
    }, [search, selectedIcon]);

    const dynamicStyle = useMemo(() => {
        const h = matches ? minLgH : minHSmallScreen ?? minLgH;
        return {
            minHeight: `${h}px`,
            height: `${h}px`
        };
    }, [matches, minLgH, minHSmallScreen]);

    const borderCss =
        "border border-primary rounded-md w-[45vw] md:w-[320px] lg:w-[15rem] bg-background";
    const labelCss = "text-lg md:text-2xl md:text-xl text-secondary";
    const errorCss = "text-error text-sm leading-snug break-words whitespace-normal max-w-full mt-1";

    return (
        <div className="flex flex-col">
            <div className="flex">
                <label htmlFor="icon" className={labelCss}>
                    {t("Icon")}
                </label>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    name="icon"
                    id="icon"
                    className="w-[30vw] md:w-[190px] ml-1 pl-1 border border-primary rounded-md outline-none bg-background text-secondary placeholder:text-placeholder transition-colors duration-200"
                    placeholder={t("IconPlaceholder")}
                />
            </div>
            {iconError ? <p className={errorCss} title={iconError}>{iconError}</p> : null}

            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-error" : ""} p-2`}
                style={dynamicStyle}
            >
                {icons.map((index) => (
                    <p
                        onClick={() => setSelectedIcon(index.name)}
                        key={index.name}
                        className={`${
                            index.name === selectedIcon
                                ? "scale-110 text-primary border-2 border-primary rounded-md"
                                : "text-description"
                        } text-4xl m-1 hover:text-primary hover:scale-105 cursor-pointer transition-all duration-150`}
                    >
                        <index.IconComponent />
                    </p>
                ))}
            </div>
        </div>
    );
}

export default React.memo(IconsBox);
