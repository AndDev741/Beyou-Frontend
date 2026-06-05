export type GreetingKey = "GoodMorning" | "GoodAfternoon" | "GoodEvening" | "GoodNight";

export function getGreetingKey(hour: number): GreetingKey {
    if (hour >= 5 && hour < 12) return "GoodMorning";
    if (hour >= 12 && hour < 17) return "GoodAfternoon";
    if (hour >= 17 && hour < 21) return "GoodEvening";
    return "GoodNight";
}
