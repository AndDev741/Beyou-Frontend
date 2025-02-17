type category = {
    id: string,
    name: string,
    description: string,
    iconId: string,
    habits: Array<Map<string, string>>,
    xp: number,
    nextLevelXp: number,
    actualLevelXp: number,
    level: number,
    createdAt: Date
};

export default category;