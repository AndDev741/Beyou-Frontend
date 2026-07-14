import { render, waitFor } from "@testing-library/react";
import { useDispatch } from "react-redux";
import { vi, type Mock, describe, test, expect, beforeEach } from "vitest";
import { useAgentRefresh } from "./useAgentRefresh";

vi.mock("react-redux", async () => ({
  ...(await vi.importActual<typeof import("react-redux")>("react-redux")),
  useDispatch: vi.fn(),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

vi.mock("@beyou/api/habits/getHabits", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/routine/getRoutines", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/routine/getTodayRoutine", () => ({ default: vi.fn() }));
// Keep the logger quiet + assertable for the unknown-domain path.
vi.mock("@beyou/api", () => ({ getLogger: () => ({ error: vi.fn() }) }));

import getHabits from "@beyou/api/habits/getHabits";
import getRoutines from "@beyou/api/routine/getRoutines";
import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";

const dispatch = vi.fn();
const typesOf = () => dispatch.mock.calls.map((c) => c[0]?.type);

function run(domains: string[]) {
  function Harness() {
    const refresh = useAgentRefresh();
    refresh(domains);
    return null;
  }
  render(<Harness />);
}

beforeEach(() => {
  vi.clearAllMocks();
  (useDispatch as unknown as Mock).mockReturnValue(dispatch);
  (getHabits as unknown as Mock).mockResolvedValue({ success: [{ id: "h1" }] });
  (getRoutines as unknown as Mock).mockResolvedValue({ success: [{ id: "r1" }] });
  (getTodayRoutine as unknown as Mock).mockResolvedValue({ success: { id: "r1" } });
});

describe("useAgentRefresh", () => {
  test("maps a domain to its slice refetch", async () => {
    run(["habits"]);
    await waitFor(() => expect(getHabits).toHaveBeenCalled());
    await waitFor(() => expect(typesOf()).toContain("habits/enterHabits"));
  });

  test("routines also refreshes today's view", async () => {
    run(["routines"]);
    await waitFor(() => expect(getTodayRoutine).toHaveBeenCalled());
    await waitFor(() => {
      expect(typesOf()).toContain("routines/enterRoutines");
      expect(typesOf()).toContain("todayRoutine/enterTodayRoutine");
    });
  });

  // Regression for #6: a failed getTodayRoutine (success === undefined) must NOT
  // wipe the routine view.
  test("does not dispatch today's routine when the fetch failed", async () => {
    (getTodayRoutine as unknown as Mock).mockResolvedValue({ error: { message: "boom" } });
    run(["routines"]);
    await waitFor(() => expect(getTodayRoutine).toHaveBeenCalled());
    await waitFor(() => expect(typesOf()).toContain("routines/enterRoutines"));
    expect(typesOf()).not.toContain("todayRoutine/enterTodayRoutine");
  });

  test("null today's routine (genuinely none) is still dispatched", async () => {
    (getTodayRoutine as unknown as Mock).mockResolvedValue({ success: null });
    run(["routines"]);
    await waitFor(() => expect(typesOf()).toContain("todayRoutine/enterTodayRoutine"));
  });

  test("an unknown domain is ignored without throwing", async () => {
    run(["not-a-slice"]);
    await waitFor(() => expect(dispatch).not.toHaveBeenCalled());
  });
});
