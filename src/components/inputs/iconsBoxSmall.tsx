import { TFunction } from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import i18next from "i18next";
import { searchIcons, getIconCategories, getIconCategoryLabel, normalizeIconId } from "../icons/iconSearchIndex";
import { getRecentIconIds, pushRecentIconId } from "../icons/iconRecents";
import { getEntryById, IconEntry } from "../icons/iconRegistry";

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
    const [category, setCategory] = useState("all");
    const [recentIds, setRecentIds] = useState<string[]>(getRecentIconIds());
    const [showMore, setShowMore] = useState(false);
    const [supportsHover, setSupportsHover] = useState(
        window.matchMedia("(hover: hover)").matches
    );
    const closeTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (category === "recents" && recentIds.length === 0) {
            setCategory("all");
        }
    }, [category, recentIds.length]);
    useEffect(() => {
        const mediaQuery = window.matchMedia("(hover: hover)");
        const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const locale = i18next.language || "en";
    const selectedCanonical = useMemo(() => normalizeIconId(selectedIcon), [selectedIcon]);
    const availableCategories = useMemo(() => getIconCategories(), []);

    const categoryOptions = useMemo(() => {
        const base = [
            { id: "all", label: t("IconCategoryAll") }
        ];
        if (recentIds.length > 0) {
            base.push({ id: "recents", label: t("IconCategoryRecents") });
        }

        const baseCategories = ["icons", "emoji"];
        const extraCategories = availableCategories.filter(
            (cat) => !baseCategories.includes(cat)
        );
        const ordered = [
            "smileys",
            "people",
            "nature",
            "food",
            "travel",
            "activities",
            "objects",
            "symbols",
            "flags"
        ];
        const sortedExtras = ordered
            .filter((cat) => extraCategories.includes(cat))
            .concat(extraCategories.filter((cat) => !ordered.includes(cat)));

        const baseLabels = baseCategories.map((cat) => ({
            id: cat,
            label: getIconCategoryLabel(cat, locale)
        }));

        return [...base, ...baseLabels, ...sortedExtras.map((cat) => ({
            id: cat,
            label: getIconCategoryLabel(cat, locale)
        }))];
    }, [availableCategories, locale, recentIds.length, t]);

    const { visibleCategories, hiddenCategories } = useMemo(() => {
        const maxVisible = 2;
        return {
            visibleCategories: categoryOptions.slice(0, maxVisible),
            hiddenCategories: categoryOptions.slice(maxVisible)
        };
    }, [categoryOptions]);

    useEffect(() => {
        setShowMore(false);
    }, [category]);
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current !== null) {
                window.clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const handleOpenMore = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setShowMore(true);
    };

    const handleCloseMore = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            setShowMore(false);
            closeTimeoutRef.current = null;
        }, 200);
    };

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
            limit: 24
        });
    }, [category, locale, search]);

    const iconsToDisplay = category === "recents" ? recentEntries : nonRecentIcons;

    const handleSelect = (iconId: string) => {
        const canonical = normalizeIconId(iconId);
        pushRecentIconId(canonical);
        setRecentIds(getRecentIconIds());
        setSelectedIcon(canonical);
    };

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
            <div className="flex items-center gap-2 mt-2 flex-nowrap whitespace-nowrap">
                {visibleCategories.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setCategory(option.id)}
                        className={`px-2 py-1 text-[10px] rounded-full border transition-colors duration-150 ${
                            category === option.id
                                ? "bg-primary text-background border-primary"
                                : "border-primary/30 text-secondary hover:bg-primary/10"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
                {hiddenCategories.length > 0 && (
                    <div
                        className="relative"
                        onMouseEnter={supportsHover ? handleOpenMore : undefined}
                        onMouseLeave={supportsHover ? handleCloseMore : undefined}
                    >
                        <button
                            type="button"
                            aria-label={t("IconCategoryMore")}
                            onClick={() => setShowMore((prev) => !prev)}
                            className={`px-2 py-1 text-[10px] rounded-full border transition-colors duration-150 ${
                                hiddenCategories.some((item) => item.id === category)
                                    ? "bg-primary text-background border-primary"
                                    : "border-primary/30 text-secondary hover:bg-primary/10"
                            }`}
                        >
                            ...
                        </button>
                        <div
                            onMouseEnter={supportsHover ? handleOpenMore : undefined}
                            onMouseLeave={supportsHover ? handleCloseMore : undefined}
                            className={`absolute right-0 top-full mt-2 min-w-[160px] max-w-[calc(100vw-16px)] bg-background border border-primary/20 rounded-lg shadow-lg p-2 transition-opacity duration-150 z-50 ${
                                showMore ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                            }`}
                        >
                            <div className="flex flex-wrap gap-2">
                                {hiddenCategories.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setCategory(option.id)}
                                        className={`px-2 py-1 text-[10px] rounded-full border transition-colors duration-150 ${
                                            category === option.id
                                                ? "bg-primary text-background border-primary"
                                                : "border-primary/30 text-secondary hover:bg-primary/10"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div
                className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} ${iconError ? "border-error" : ""} min-h-[180px] ${minLgH ? `md:min-h-[${minLgH}px]` : "md:min-h-[100px]"} p-1`}
            >
                {iconsToDisplay.length === 0 ? (
                    <div className="text-xs text-description p-2">
                        {t("IconNoResults")}
                    </div>
                ) : (
                    iconsToDisplay.map((entry) => (
                        <span
                            onClick={() => handleSelect(entry.id)}
                            key={entry.id}
                            className={`${entry.id === selectedCanonical
                                ? "scale-110 text-primary border border-primary rounded"
                                : "text-description"
                                } text-3xl m-1 hover:text-primary hover:scale-105 cursor-pointer transition-all duration-150`}
                        >
                            <entry.IconComponent />
                        </span>
                    ))
                )}
            </div>
        </>
    );
}

export default React.memo(IconsBoxSmall);
