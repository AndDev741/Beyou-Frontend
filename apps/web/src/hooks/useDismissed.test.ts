import { act, renderHook } from "@testing-library/react";
import { useDismissed } from "./useDismissed";

beforeEach(() => {
    window.localStorage.clear();
});

test("starts visible and remembers the dismissal", () => {
    const { result } = renderHook(() => useDismissed("widgets-invite"));
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("beyou-dismissed:widgets-invite")).toBe("1");
});

test("starts dismissed when the flag is already stored", () => {
    window.localStorage.setItem("beyou-dismissed:widgets-invite", "1");
    const { result } = renderHook(() => useDismissed("widgets-invite"));
    expect(result.current[0]).toBe(true);
});

test("keys are independent", () => {
    window.localStorage.setItem("beyou-dismissed:widgets-invite", "1");
    const { result } = renderHook(() => useDismissed("other-invite"));
    expect(result.current[0]).toBe(false);
});
