import { render, waitFor } from "@testing-library/react";
import { useDispatch } from "react-redux";
import { vi, type Mock } from "vitest";
import useUiRefresh from "./useUiRefresh";
import { RefreshUI } from "../types/refreshUi/refreshUi.type";
import {
  actualLevelXpEnter,
  alreadyIncreaseConstanceTodayEnter,
  constanceEnter,
  levelEnter,
  maxConstanceEnter,
  nextLevelXpEnter,
  xpEnter,
} from "../redux/user/perfilSlice";
import { refreshCategorie } from "../redux/category/categoriesSlice";
import { refreshItemGroup } from "../redux/routine/todayRoutineSlice";

vi.mock("react-redux", async () => ({
  ...(await vi.importActual<typeof import("react-redux")>("react-redux")),
  useDispatch: vi.fn(),
}));

const dispatch = vi.fn();

function HookHarness({ refreshUi }: { refreshUi: RefreshUI }) {
  useUiRefresh(refreshUi);
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  (useDispatch as unknown as Mock).mockReturnValue(dispatch);
});

test("dispatches user refresh actions", async () => {
  const refreshUi: RefreshUI = {
    refreshUser: {
      currentConstance: 10,
      alreadyIncreaseConstanceToday: true,
      maxConstance: 20,
      xp: 100,
      level: 2,
      actualLevelXp: 50,
      nextLevelXp: 200,
    },
  };

  render(<HookHarness refreshUi={refreshUi} />);

  await waitFor(() => {
    expect(dispatch).toHaveBeenCalledWith(xpEnter(100));
    expect(dispatch).toHaveBeenCalledWith(levelEnter(2));
    expect(dispatch).toHaveBeenCalledWith(constanceEnter(10));
    expect(dispatch).toHaveBeenCalledWith(maxConstanceEnter(20));
    expect(dispatch).toHaveBeenCalledWith(alreadyIncreaseConstanceTodayEnter(true));
    expect(dispatch).toHaveBeenCalledWith(nextLevelXpEnter(200));
    expect(dispatch).toHaveBeenCalledWith(actualLevelXpEnter(50));
  });
});

test("dispatches category refresh actions", async () => {
  const refreshCategories = [
    { id: "c1", xp: 10, level: 1, actualLevelXp: 5, nextLevelXp: 20 },
    { id: "c2", xp: 30, level: 3, actualLevelXp: 15, nextLevelXp: 40 },
  ];

  render(<HookHarness refreshUi={{ refreshCategories }} />);

  await waitFor(() => {
    expect(dispatch).toHaveBeenCalledWith(refreshCategorie(refreshCategories[0]));
    expect(dispatch).toHaveBeenCalledWith(refreshCategorie(refreshCategories[1]));
  });
});

test("dispatches item checked refresh action", async () => {
  const refreshItemChecked = {
    groupItemId: "g1",
    check: {
      id: "c1",
      checkDate: "2024-01-01",
      checkTime: "08:00",
      checked: true,
      skipped: false,
      xpGenerated: 0
    }
  };

  render(<HookHarness refreshUi={{ refreshItemChecked }} />);

  await waitFor(() => {
    expect(dispatch).toHaveBeenCalledWith(refreshItemGroup(refreshItemChecked));
  });
});

test("does not dispatch when no refresh payload is provided", async () => {
  render(<HookHarness refreshUi={{}} />);

  await waitFor(() => {
    expect(dispatch).not.toHaveBeenCalled();
  });
});
