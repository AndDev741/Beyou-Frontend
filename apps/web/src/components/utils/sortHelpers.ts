export const compareNumbers = (a?: number, b?: number) => (a ?? 0) - (b ?? 0);

export const compareStrings = (a?: string, b?: string) =>
  (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

export const getTimestamp = (value?: Date | string | null) => {
  if (!value) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const sortItems = <T>(items: T[], compare: (a: T, b: T) => number) =>
  [...items].sort(compare);
