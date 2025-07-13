import { TFunction } from "i18next";
import { IconObject } from "../../types/icons/IconObject";
import { useEffect, useState, useMemo } from "react";
import iconRender from "../icons/iconsRender";

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
        "border-solid border-[1px] border-blueMain rounded-md w-[45vw] md:w-[320px] lg:w-[15rem]";
    const labelCss = "text-2xl md:text-xl";

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
                    className="w-[30vw] md:w-[190px] ml-1 pl-1 border-[1px] rounded-md outline-none"
                    placeholder={t("IconPlaceholder")}
                />
            </div>
            <p className="text-red-500 text-lg">{iconError}</p>

            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-red-500" : ""} p-2`}
                style={dynamicStyle}
            >
                {icons.map((index) => (
                    <p
                        onClick={() => setSelectedIcon(index.name)}
                        key={index.name}
                        className={`${
                            index.name === selectedIcon
                                ? "scale-110 text-blueMain border-2 border-blueMain rounded-md"
                                : "text-gray-500"
                        } text-4xl m-1 hover:text-blueMain hover:scale-105 cursor-pointer`}
                    >
                        <index.IconComponent />
                    </p>
                ))}
            </div>
        </div>
    );
}

export default IconsBox;