import { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import i18next from "i18next";
import {
    searchIcons,
    getIconCategories,
    getIconCategoryLabel,
    normalizeIconId,
    getEntryById,
    createIconRecents,
    type IconEntry,
} from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";

const iconRecents = createIconRecents(typeof window !== "undefined" ? window.localStorage : undefined);

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
    const [showDomains, setShowDomains] = useState(false);
    const [recentIds, setRecentIds] = useState<string[]>(() => iconRecents.getRecentIconIds());

    useEffect(() => {
        if (category === "recents" && recentIds.length === 0) {
            setCategory("all");
        }
    }, [category, recentIds.length]);

    const locale = i18next.language || "en";
    const selectedCanonical = useMemo(() => normalizeIconId(selectedIcon), [selectedIcon]);

    // Type filters (icons vs emoji) plus the domain categories, which stay folded
    // behind "More categories" so this compact picker keeps its single chip row.
    const primaryOptions = useMemo(() => {
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

    const domainOptions = useMemo(
        () =>
            getIconCategories().map((id) => ({
                id,
                label: getIconCategoryLabel(id, locale)
            })),
        [locale]
    );

    const isDomainCategory = useMemo(
        () => domainOptions.some((option) => option.id === category),
        [category, domainOptions]
    );

    // A chosen domain chip stays on screen while it is filtering the grid.
    const domainsVisible = showDomains || isDomainCategory;

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
        iconRecents.pushRecentIconId(canonical);
        setRecentIds(iconRecents.getRecentIconIds());
        setSelectedIcon(canonical);
    };

    return (
        // The selector follows the form's width. It used to be a fixed width
        // (45vw / 160px / 12rem) and the search field fit into ~90px, cutting the
        // placeholder in half.
        <div className="w-full">
            <div className="flex items-center gap-2.5">
                <label htmlFor="icon-small" className="shrink-0 text-[12.5px] font-semibold text-text-2">
                    {t("Icon")}
                </label>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    name="icon-small"
                    id="icon-small"
                    className="min-w-0 flex-1 rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none transition-colors duration-200 placeholder:text-text-3 focus:ring-2 focus:ring-accent/40"
                    placeholder={t("IconPlaceholder")}
                />
            </div>

            {iconError ? (
                <p className="mt-1 text-xs leading-snug text-danger" title={iconError}>
                    {iconError}
                </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {primaryOptions.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setCategory(option.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${
                            category === option.id
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border text-text-3 hover:text-text-2"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setShowDomains(!domainsVisible)}
                    aria-expanded={domainsVisible}
                    className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-semibold text-text-3 transition-colors duration-200 hover:text-text-2"
                >
                    {domainsVisible ? t("IconCategoryLess") : t("IconCategoryMore")}
                </button>
                {domainsVisible &&
                    domainOptions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setCategory(option.id)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${
                                category === option.id
                                    ? "border-accent bg-accent-soft text-accent"
                                    : "border-border text-text-3 hover:text-text-2"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
            </div>

            <div
                className={`mt-2 grid grid-cols-6 gap-1 overflow-auto rounded-control border bg-bg p-2 sm:grid-cols-8 ${
                    iconError ? "border-danger" : "border-border"
                }`}
                style={{ height: Math.max(minLgH, 132) }}
            >
                {iconsToDisplay.length === 0 ? (
                    <p className="col-span-full p-1 text-xs text-text-3">{t("IconNoResults")}</p>
                ) : (
                    iconsToDisplay.map((entry) => (
                        <button
                            type="button"
                            onClick={() => handleSelect(entry.id)}
                            key={entry.id}
                            aria-label={`${t("Icon")}: ${entry.label}`}
                            aria-pressed={entry.id === selectedCanonical}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-2xl transition-colors duration-150 ${
                                entry.id === selectedCanonical
                                    ? "bg-accent-soft text-accent ring-1 ring-accent"
                                    : "text-text-2 hover:bg-surface-2 hover:text-accent"
                            }`}
                        >
                            <BeyouIcon id={entry.id} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default React.memo(IconsBoxSmall);
