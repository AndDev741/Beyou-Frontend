type ExperienceInput = number | null | undefined;

export type ExperienceLevelName = "BEGINNER" | "INTERMEDIARY" | "ADVANCED";

export const experienceToEnum = (experience: ExperienceInput): ExperienceLevelName => {
    switch (Number(experience)) {
        case 1:
            return "INTERMEDIARY";
        case 2:
            return "ADVANCED";
        default:
            return "BEGINNER";
    }
};

/**
 * @deprecated Use experienceToEnum() instead — backend now expects ExperienceLevel enum names.
 */
export const experienceToXpLevel = (experience: ExperienceInput) => {
    let xp = 0;
    let level = 0;

    switch (Number(experience)) {
        case 1:
            level += 5
            xp += 750;
            break;
        case 2:
            level = 8;
            xp = 1800;
            break;
        default:
            level = 0;
            xp = 0;
            break;
    }

    return { level, xp };
};
