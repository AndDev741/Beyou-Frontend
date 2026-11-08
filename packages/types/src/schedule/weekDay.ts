/**
 * A day of the week as the backend writes it: capitalised English, Monday first.
 *
 * Schedules have always carried these as plain strings (`schedule.days: string[]`). This type
 * names the set for the newer fields that want it checked, a routine item's own `days`.
 *
 * It replaced a numeric `enum weekDay` (MONDAY = 0 ...) that nothing imported and that matched
 * nothing on the wire. An enum is also a runtime value, which this package is meant to have none of.
 */
export type WeekDay =
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
