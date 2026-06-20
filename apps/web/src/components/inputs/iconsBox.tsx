import { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import i18next from "i18next";
import {
    searchIcons,
    getIconCategoryLabel,
    normalizeIconId,
    getEntryById,
    createIconRecents,
    type IconEntry,
} from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";

const iconRecents = createIconRecents(typeof window !== "undefined" ? window.localStorage : undefined);

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
    const [matches, setMatches] = useState(
        window.matchMedia("(min-width: 768px)").matches
    );
    const [category, setCategory] = useState("all");
    const [recentIds, setRecentIds] = useState<string[]>(() => iconRecents.getRecentIconIds());

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 768px)");
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        if (category === "recents" && recentIds.length === 0) {
            setCategory("all");
        }
    }, [category, recentIds.length]);

    const dynamicStyle = useMemo(() => {
        const h = matches ? minLgH : minHSmallScreen ?? minLgH;
        return {
            minHeight: `${h}px`,
            height: `${h}px`
        };
    }, [matches, minLgH, minHSmallScreen]);

    const locale = i18next.language || "en";
    const selectedCanonical = useMemo(() => normalizeIconId(selectedIcon), [selectedIcon]);

    // Categories are now just icons + emoji (+ recents when present).
    const categoryOptions = useMemo(() => {
        const options = [{ id: "all", label: t("IconCategoryAll") }];
        if (recentIds.length > 0) {
            options.push({ id: "recents", label: t("IconCategoryRecents") });
        }
        options.push(
            { id: "icons", label: getIconCategoryLabel("icons", locale) },
            { id: "emoji", label: getIconCategoryLabel("emoji", locale) }
        );
        return options;
    }, [locale, recentIds.length, t]);

    const recentEntries = useMemo(() => {
        return recentIds
            .map((id) => getEntryById(id))
            .filter(Boolean) as IconEntry[];
    }, [recentIds]);

    const nonRecentIcons = useMemo(() => {
        if (category === "recents") return [];
        return searchIcons({
            query: search,
            locale,
            category,
            limit: 36
        });
    }, [category, locale, search]);

    const iconsToDisplay = category === "recents" ? recentEntries : nonRecentIcons;

    const handleSelect = (iconId: string) => {
        const canonical = normalizeIconId(iconId);
        iconRecents.pushRecentIconId(canonical);
        setRecentIds(iconRecents.getRecentIconIds());
        setSelectedIcon(canonical);
    };

    const borderCss =
        "border border-primary rounded-md w-[45vw] md:w-[320px] lg:w-[15rem] bg-background";
    const labelCss = "text-lg md:text-2xl md:text-xl text-secondary";
    const errorCss = "text-error text-sm leading-snug break-words whitespace-normal w-[45vw] md:w-[320px] lg:w-[15rem] mt-1";

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

            <div className="flex items-center gap-2 mt-2 w-[30vw] md:w-[230px] flex-wrap">
                {categoryOptions.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setCategory(option.id)}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors duration-150 ${
                            category === option.id
                                ? "bg-primary text-background border-primary"
                                : "border-primary/30 text-secondary hover:bg-primary/10"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-error" : ""} p-2`}
                style={dynamicStyle}
            >
                {iconsToDisplay.length === 0 ? (
                    <div className="text-sm text-description p-2">
                        {t("IconNoResults")}
                    </div>
                ) : (
                    iconsToDisplay.map((entry) => (
                        <button
                            type="button"
                            onClick={() => handleSelect(entry.id)}
                            key={entry.id}
                            // Prefix the accessible name so an icon label can never
                            // collide with an action button elsewhere in the form
                            // (e.g. a lucide "circle" tile vs a "Circle" submit).
                            aria-label={`${t("Icon")}: ${entry.label}`}
                            aria-pressed={entry.id === selectedCanonical}
                            className={`${
                                entry.id === selectedCanonical
                                    ? "scale-110 text-primary border-2 border-primary rounded-md"
                                    : "text-description"
                            } text-3xl m-1 bg-transparent border-0 p-0 hover:text-primary hover:scale-105 cursor-pointer transition-all duration-150`}
                        >
                            <BeyouIcon id={entry.id} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default React.memo(IconsBox);
