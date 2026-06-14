import { render, screen } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import FastTips from "./fastTips";

afterEach(() => { vi.useRealTimers(); });

test("rotates the tip by day of year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00"));
    const { unmount } = render(<FastTips />);
    const firstTip = screen.getByTestId("fast-tip").textContent;
    unmount();

    vi.setSystemTime(new Date("2026-01-02T10:00:00"));
    render(<FastTips />);
    expect(screen.getByTestId("fast-tip").textContent).not.toBe(firstTip);
});
