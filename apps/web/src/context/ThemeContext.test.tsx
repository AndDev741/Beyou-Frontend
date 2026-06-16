import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { defaultDark, defaultLight, themes } from "@beyou/theme";
import store from "../redux/store";
import { themeInUseEnter } from "@beyou/state/user/perfilSlice";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="mode">{theme.mode}</span>;
}

// ThemeProvider reads window.matchMedia("(prefers-color-scheme: dark)").matches.
function setOSPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const renderWithTheme = () =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    </Provider>,
  );

describe("ThemeContext — login OS detection + saved-theme precedence", () => {
  beforeEach(() => {
    // The login screen / a brand-new account has no saved theme.
    store.dispatch(themeInUseEnter(null));
  });

  it("applies the OS dark theme at login when no theme is saved", () => {
    setOSPrefersDark(true);
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("mode").textContent).toBe(defaultDark.mode);
  });

  it("applies the OS light theme at login when no theme is saved", () => {
    setOSPrefersDark(false);
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("mode").textContent).toBe(defaultLight.mode);
  });

  it("uses the saved theme regardless of the OS preference", () => {
    setOSPrefersDark(true); // OS is dark...
    const saved = themes.find((t) => t.mode !== defaultDark.mode)!; // ...but a non-dark theme is saved
    store.dispatch(themeInUseEnter(saved));
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("mode").textContent).toBe(saved.mode);
  });
});
