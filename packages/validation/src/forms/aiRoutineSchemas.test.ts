import { aiDescriptionSchema } from "./aiRoutineSchemas";

const t = (key: string) => key;

test("rejects descriptions shorter than 10 chars", () => {
    const result = aiDescriptionSchema(t as never).safeParse({ description: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toBe("DescriptionTooShort");
    }
});

test("rejects descriptions longer than 2000 chars", () => {
    const result = aiDescriptionSchema(t as never).safeParse({ description: "x".repeat(2001) });
    expect(result.success).toBe(false);
});

test("accepts a normal description", () => {
    const result = aiDescriptionSchema(t as never).safeParse({
        description: "I wake up at 6am, work out 3 times a week and want to read before bed"
    });
    expect(result.success).toBe(true);
});
