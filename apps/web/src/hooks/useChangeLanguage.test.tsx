import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import store from "../redux/store";

// Local i18n mock with a spy we can assert on (overrides the global setup stub).
const changeLanguage = vi.fn(() => Promise.resolve());
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage, language: "en" },
  }),
}));

vi.mock("@beyou/api/user/editUser", () => ({
  default: vi.fn(() => Promise.resolve()),
}));

import editUser from "@beyou/api/user/editUser";
import useChangeLanguage from "./useChangeLanguage";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(Provider, { store, children });

describe("useChangeLanguage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies a real language to i18next", () => {
    renderHook(() => useChangeLanguage("pt"), { wrapper });
    expect(changeLanguage).toHaveBeenCalledWith("pt");
  });

  it("does NOT change language when lng is empty — preserves the login-screen selection", () => {
    // A brand-new user's DTO languageInUse is "". changeLanguage("") would
    // reset i18next to the fallback (en) and undo the user's pick.
    renderHook(() => useChangeLanguage(""), { wrapper });
    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it("persists the choice to the backend when updateUser is true", async () => {
    renderHook(() => useChangeLanguage("pt", true), { wrapper });
    await waitFor(() => expect(editUser).toHaveBeenCalledWith({ language: "pt" }));
  });

  it("does NOT persist to the backend on the login screen (updateUser falsy)", () => {
    renderHook(() => useChangeLanguage("pt"), { wrapper });
    expect(editUser).not.toHaveBeenCalled();
  });
});
