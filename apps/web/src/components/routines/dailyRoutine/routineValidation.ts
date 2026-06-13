export const ITEM_TIME_TOLERANCE_MINUTES = 5;

const normalizeMinutes = (minutes: number) => (minutes + 1440) % 1440;

const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

export const isOvernightRange = (startTime?: string, endTime?: string) =>
    Boolean(startTime && endTime && endTime < startTime);

const isWithinSectionWithTolerance = (
    time: string,
    sectionStart?: string,
    sectionEnd?: string,
    toleranceMinutes = ITEM_TIME_TOLERANCE_MINUTES
) => {
    if (!sectionStart && !sectionEnd) return true;

    const timeMinutes = toMinutes(time);

    if (sectionStart && sectionEnd) {
        const startMinutes = toMinutes(sectionStart);
        const endMinutes = toMinutes(sectionEnd);
        const minMinutes = startMinutes - toleranceMinutes;
        const maxMinutes = endMinutes + toleranceMinutes;
        const isOvernight = isOvernightRange(sectionStart, sectionEnd);

        if (!isOvernight) {
            const clampedMin = Math.max(0, minMinutes);
            const clampedMax = Math.min(1439, maxMinutes);
            return timeMinutes >= clampedMin && timeMinutes <= clampedMax;
        }

        const startWindow = Math.max(0, minMinutes);
        const endWindow = Math.min(1439, maxMinutes);
        return timeMinutes >= startWindow || timeMinutes <= endWindow;
    }

    if (sectionStart) {
        const minMinutes = normalizeMinutes(toMinutes(sectionStart) - toleranceMinutes);
        return timeMinutes >= minMinutes;
    }

    const maxMinutes = normalizeMinutes(toMinutes(sectionEnd!) + toleranceMinutes);
    return timeMinutes <= maxMinutes;
};

export const getSectionErrorKeys = (name?: string, startTime?: string) => {
    const errors: string[] = [];
    if (!name || !name.trim()) errors.push("RoutineSectionNameRequired");
    if (!startTime) errors.push("RoutineSectionStartRequired");
    return errors;
};

export const getItemTimeErrorKeys = (
    sectionStart?: string,
    sectionEnd?: string,
    startTime?: string,
    endTime?: string
) => {
    const errors: string[] = [];

    if (!startTime && !endTime) return errors;

    const sectionOvernight = isOvernightRange(sectionStart, sectionEnd);

    if (startTime && endTime && !sectionOvernight) {
        if (toMinutes(endTime) < toMinutes(startTime)) {
            errors.push("ItemEndAfterStart");
        }
    }

    if (startTime && !isWithinSectionWithTolerance(startTime, sectionStart, sectionEnd)) {
        errors.push("ItemStartWithinSection");
    }

    if (endTime && !isWithinSectionWithTolerance(endTime, sectionStart, sectionEnd)) {
        errors.push("ItemEndWithinSection");
    }

    return errors;
};
