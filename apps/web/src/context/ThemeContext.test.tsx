import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { buildTheme, themeFromStoredMode } from "@beyou/theme";
import store from "../redux/store";
import { themeInUseEnter } from "@beyou/state/user/perfilSlice";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { theme } = useTheme();
  return (
    <>
      <span data-testid="mode">{theme.mode}</span>
      <span data-testid="base">{theme.base}</span>
      <span data-testid="accent">{theme.accent}</span>
      <span data-testid="pack">{theme.accentPack}</span>
    </>
  );
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

describe("ThemeContext — OS detection, saved preference and legacy migration", () => {
  beforeEach(() => {
    // The login screen / a brand-new account has no saved theme — neither on
    // the account (redux) nor as a pre-signup pick (localStorage).
    store.dispatch(themeInUseEnter(null));
    localStorage.clear();
  });

  it("follows the OS into dark when nothing is saved", () => {
    setOSPrefersDark(true);
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe("dark");
    expect(getByTestId("mode").textContent).toBe("system:beyou");
  });

  it("follows the OS into light when nothing is saved", () => {
    setOSPrefersDark(false);
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe("light");
  });

  it("uses the saved preference regardless of the OS", () => {
    setOSPrefersDark(true); // OS is dark...
    const saved = buildTheme({ mode: "light", accentPack: "forest" }); // ...but light is saved
    store.dispatch(themeInUseEnter(saved));
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe("light");
    expect(getByTestId("pack").textContent).toBe("forest");
  });

  it("falls back to the localStorage pick over the OS preference", () => {
    // A theme chosen on the login page before signing up is stored locally;
    // an account with no theme of its own should carry that pick forward.
    setOSPrefersDark(true);
    localStorage.setItem("beyou-theme", "light:amethyst");
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe("light");
    expect(getByTestId("pack").textContent).toBe("amethyst");
  });

  it("lets the account preference win over the localStorage pick", () => {
    setOSPrefersDark(true);
    localStorage.setItem("beyou-theme", "light:amethyst");
    store.dispatch(themeInUseEnter(buildTheme({ mode: "dark", accentPack: "cyber" })));
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe("dark");
    expect(getByTestId("pack").textContent).toBe("cyber");
  });

  // Os 9 temas antigos foram salvos no backend como string. Ninguém pode ficar
  // sem tema quando o modo salvo deixa de existir.
  it.each([
    ["beYouDark", "dark", "beyou"],
    ["Cyberpunk", "dark", "cyber"],
    ["Late Latte", "dark", "sunset"], // tema escuro apesar do acento caramelo
    ["Mocha", "light", "sunset"],
    ["Amethyst", "light", "amethyst"],
    ["um-tema-que-nao-existe-mais", "light", "beyou"], // cai no system + OS claro
  ])("migrates the legacy mode %s", (legacy, base, pack) => {
    setOSPrefersDark(false);
    store.dispatch(themeInUseEnter(themeFromStoredMode(legacy)));
    const { getByTestId } = renderWithTheme();
    expect(getByTestId("base").textContent).toBe(base);
    expect(getByTestId("pack").textContent).toBe(pack);
  });
});
