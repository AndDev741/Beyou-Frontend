import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import { taskFormSchema } from "./taskSchemas";
import { goalFormSchema } from "./goalSchemas";
import { routineFormSchema } from "./routineSchemas";
import { profileSchema } from "./profileSchemas";
import { habitCreateSchema } from "./habitSchemas";
import { categoryCreateSchema } from "./categorySchemas";

/**
 * The zod maxes must mirror the Postgres column widths, which differ per table:
 * goals, tasks, routines and users hold varchar(255); habits and categories hold
 * varchar(256). A schema one character looser than its column lets the form submit
 * text the backend rejects with a 400 (the AI-onboarding HABIT_CREATE_FAILED bug
 * came out of exactly this gap).
 *
 * Assertions go through safeParse and inspect issues per path, so a fixture does
 * not have to satisfy every other field of the schema.
 */

// Renders the interpolation the real i18next would receive, so a test can assert
// which max the message reports.
const t = ((key: string, options?: { max?: number }) =>
    options?.max !== undefined ? `${key}:${options.max}` : key) as TFunction;

const text = (length: number) => "x".repeat(length);

const issuesAt = (schema: { safeParse: (v: unknown) => any }, value: unknown, path: string) => {
    const result = schema.safeParse(value);
    if (result.success) return [];
    return result.error.issues.filter((issue: { path: unknown[] }) => issue.path.includes(path));
};

describe("varchar(255) tables reject 256 characters in the form", () => {
    it("task name and description cap at 255", () => {
        const schema = taskFormSchema(t);
        expect(issuesAt(schema, { name: text(255), description: text(255) }, "name")).toEqual([]);
        expect(issuesAt(schema, { name: text(255), description: text(255) }, "description")).toEqual([]);
        expect(issuesAt(schema, { name: text(256) }, "name").map((i: any) => i.message)).toContain(
            "YupMaxName:255"
        );
        expect(
            issuesAt(schema, { description: text(256) }, "description").map((i: any) => i.message)
        ).toContain("YupDescriptionMaxValue:255");
    });

    it("goal title, description and motivation cap at 255", () => {
        const schema = goalFormSchema(t);
        const fine = { title: text(255), description: text(255), motivation: text(255) };
        for (const path of ["title", "description", "motivation"]) {
            expect(issuesAt(schema, fine, path)).toEqual([]);
        }
        expect(issuesAt(schema, { title: text(256) }, "title").map((i: any) => i.message)).toContain(
            "YupMaxName:255"
        );
        expect(
            issuesAt(schema, { description: text(256) }, "description").map((i: any) => i.message)
        ).toContain("YupDescriptionMaxValue:255");
        expect(
            issuesAt(schema, { motivation: text(256) }, "motivation").map((i: any) => i.message)
        ).toContain("YupDescriptionMaxValue:255");
    });

    it("routine name caps at 255", () => {
        const schema = routineFormSchema(t);
        expect(issuesAt(schema, { routineName: text(255) }, "routineName")).toEqual([]);
        expect(
            issuesAt(schema, { routineName: text(256) }, "routineName").map((i: any) => i.message)
        ).toContain("YupMaxName:255");
    });

    it("profile name, phrase and author cap at 255", () => {
        const schema = profileSchema(t);
        const fine = { name: text(255), phrase: text(255), phrase_author: text(255) };
        for (const path of ["name", "phrase", "phrase_author"]) {
            expect(issuesAt(schema, fine, path)).toEqual([]);
        }
        expect(issuesAt(schema, { name: text(256) }, "name").map((i: any) => i.message)).toContain(
            "YupMaxName:255"
        );
        expect(
            issuesAt(schema, { phrase: text(256) }, "phrase").map((i: any) => i.message)
        ).toContain("YupGenericMaxLength:255");
    });
});

describe("varchar(256) tables keep the 256 limit", () => {
    it("habit name, description and motivational phrase allow 256", () => {
        const schema = habitCreateSchema(t);
        const fine = { name: text(256), description: text(256), motivationalPhrase: text(256) };
        for (const path of ["name", "description", "motivationalPhrase"]) {
            expect(issuesAt(schema, fine, path)).toEqual([]);
        }
        expect(issuesAt(schema, { name: text(257) }, "name").map((i: any) => i.message)).toContain(
            "YupMaxName:256"
        );
    });

    it("category name and description allow 256", () => {
        const schema = categoryCreateSchema(t);
        const fine = { name: text(256), description: text(256) };
        for (const path of ["name", "description"]) {
            expect(issuesAt(schema, fine, path)).toEqual([]);
        }
        expect(issuesAt(schema, { name: text(257) }, "name").map((i: any) => i.message)).toContain(
            "YupMaxName:256"
        );
    });
});
