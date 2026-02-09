type ExperienceInput = number | null | undefined;

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
