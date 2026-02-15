import React from "react";
import * as MdIcons from "react-icons/md";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import { IconBaseProps, IconType } from "react-icons";
import emojiData from "emoji-datasource/emoji.json";

export type IconEntry = {
    id: string;
    type: "icon" | "emoji";
    label: string;
    keywords: string[];
    categories: string[];
    IconComponent: IconType;
    legacyIds: string[];
    emoji?: string;
};

type EmojiRecord = {
    short_name: string;
    short_names?: string[];
    unified: string;
    category?: string;
    keywords?: string[];
    skin_variations?: Record<string, { unified: string }>;
};

const ICON_SETS: Record<string, Record<string, IconType>> = {
    md: MdIcons,
    fa: FaIcons,
    ai: AiIcons
};

const emojiCategoryMap: Record<string, string> = {
    "Smileys & Emotion": "smileys",
    "People & Body": "people",
    "Animals & Nature": "nature",
    "Food & Drink": "food",
    "Travel & Places": "travel",
    Activities: "activities",
    Objects: "objects",
    Symbols: "symbols",
    Flags: "flags"
};

const toWords = (value: string) =>
    value
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();

const toKeywords = (value: string) =>
    toWords(value)
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

const humanizeIconName = (name: string) => {
    const cleaned = name.replace(/^(Md|Fa|Ai)/, "");
    return toWords(cleaned) || cleaned;
};

const emojiFromUnified = (unified: string) =>
    unified
        .split("-")
        .map((code) => String.fromCodePoint(parseInt(code, 16)))
        .join("");

const createEmojiComponent = (emoji: string, label: string): IconType => {
    const EmojiIcon = ({ size, className, style, ...rest }: IconBaseProps) => {
        const fontSize =
            typeof size === "number" ? `${size}px` : size || "1em";
        const mergedStyle: React.CSSProperties = {
            fontSize,
            lineHeight: 1,
            display: "inline-flex",
            ...(style || {})
        };
        return React.createElement(
            "span",
            {
                role: "img",
                "aria-label": label,
                className,
                style: mergedStyle,
                ...rest
            },
            emoji
        );
    };
    return EmojiIcon;
};

const buildReactIconEntries = (): IconEntry[] => {
    const entries: IconEntry[] = [];
    for (const [prefix, iconSet] of Object.entries(ICON_SETS)) {
        for (const iconName of Object.keys(iconSet)) {
            const label = humanizeIconName(iconName);
            const keywords = toKeywords(label);
            const id = `ri:${prefix}/${iconName}`;
            entries.push({
                id,
                type: "icon",
                label,
                keywords,
                categories: ["icons"],
                IconComponent: iconSet[iconName as keyof typeof iconSet],
                legacyIds: [iconName, `${prefix}/${iconName}`]
            });
        }
    }
    return entries;
};

const buildEmojiEntries = (): IconEntry[] => {
    const entries: IconEntry[] = [];
    (emojiData as EmojiRecord[]).forEach((emoji) => {
        if (!emoji.unified) {
            return;
        }
        const char = emojiFromUnified(emoji.unified);
        const label = emoji.short_name.replace(/_/g, " ");
        const keywords = Array.from(
            new Set([
                ...toKeywords(label),
                ...(emoji.keywords || []),
                ...(emoji.short_names || [])
            ])
        );
        const category =
            (emoji.category && emojiCategoryMap[emoji.category]) || "emoji";
        entries.push({
            id: `emoji:${emoji.short_name}`,
            type: "emoji",
            label,
            keywords,
            categories: [category, "emoji"],
            IconComponent: createEmojiComponent(char, label),
            legacyIds: [char],
            emoji: char
        });
    });
    return entries;
};

export const allEntries: IconEntry[] = [
    ...buildReactIconEntries(),
    ...buildEmojiEntries()
];

const indexById: Record<string, IconEntry> = {};
allEntries.forEach((entry) => {
    indexById[entry.id] = entry;
    entry.legacyIds.forEach((legacy) => {
        indexById[legacy] = entry;
    });
});

export const getEntryById = (id: string): IconEntry | undefined => {
    if (!id) return undefined;
    const direct = indexById[id];
    if (direct) return direct;
    const lower = id.toLowerCase();
    return allEntries.find(
        (entry) =>
            entry.id.toLowerCase().includes(lower) ||
            entry.legacyIds.some((legacy) =>
                legacy.toLowerCase().includes(lower)
            )
    );
};

export const getCanonicalId = (id: string): string => {
    const entry = getEntryById(id);
    return entry?.id ?? id;
};

export const getAvailableCategories = (): string[] => {
    const categories = new Set<string>();
    allEntries.forEach((entry) => {
        entry.categories.forEach((category) => categories.add(category));
    });
    return Array.from(categories);
};

export const getIconObjectById = (id: string) => {
    const entry = getEntryById(id);
    if (!entry) return undefined;
    return {
        name: entry.id,
        IconComponent: entry.IconComponent
    };
};
