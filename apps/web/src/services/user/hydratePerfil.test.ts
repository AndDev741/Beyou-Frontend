import { describe, it, expect, vi } from "vitest";
import { UserType } from "@beyou/types/user/UserType";
import { hydratePerfil } from "./hydratePerfil";

/**
 * Every path that loads the user goes through here — UI login, Google login and
 * the silent refresh on boot. The `perfil` slice is deliberately NOT persisted
 * (it holds PII), so a field missed here is a field the app never sees again
 * after a reload.
 */
const user = (overrides: Partial<UserType> = {}): UserType =>
    ({
        name: "Ana",
        email: "ana@test.com",
        phrase: "keep going",
        phrase_author: "someone",
        constance: 4,
        photo: "/api/v1/user/photo/1",
        isGoogleAccount: false,
        widgetsId: ["constance"],
        themeInUse: null,
        xp: 120,
        level: 3,
        nextLevelXp: 200,
        actualLevelXp: 100,
        constanceIncreaseToday: true,
        maxConstance: 9,
        languageInUse: "pt",
        isTutorialCompleted: true,
        timezone: "America/Sao_Paulo",
        xpDecayStrategy: "GRADUAL",
        ...overrides,
    }) as UserType;

/** Payload of the dispatched action for a given slice action type. */
const payloadOf = (dispatch: ReturnType<typeof vi.fn>, type: string) =>
    dispatch.mock.calls.map(([action]) => action).find((action) => action?.type === type)?.payload;

describe("hydratePerfil", () => {
    it("dispatches every profile field", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user());

        expect(payloadOf(dispatch, "perfil/nameEnter")).toBe("Ana");
        expect(payloadOf(dispatch, "perfil/emailEnter")).toBe("ana@test.com");
        expect(payloadOf(dispatch, "perfil/constanceEnter")).toBe(4);
        expect(payloadOf(dispatch, "perfil/widgetsIdInUseEnter")).toEqual(["constance"]);
        expect(payloadOf(dispatch, "perfil/xpEnter")).toBe(120);
        expect(payloadOf(dispatch, "perfil/levelEnter")).toBe(3);
        expect(payloadOf(dispatch, "perfil/maxConstanceEnter")).toBe(9);
        expect(payloadOf(dispatch, "perfil/timezoneEnter")).toBe("America/Sao_Paulo");
        expect(payloadOf(dispatch, "perfil/xpDecayStrategyEnter")).toBe("GRADUAL");
    });

    // `themeInUse` holds the resolved Theme object, so the migration is checked
    // through the mode string it carries.
    it("migrates a legacy theme name on the way in", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user({ themeInUse: "Late Latte" }));

        const theme = payloadOf(dispatch, "perfil/themeInUseEnter");
        // Late Latte is a DARK theme despite the caramel accent.
        expect(theme.mode).toBe("dark:sunset");
        expect(theme.base).toBe("dark");
        expect(theme.accentPack).toBe("sunset");
    });

    it("keeps a new-style mode as it is", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user({ themeInUse: "dark:cyber" }));

        expect(payloadOf(dispatch, "perfil/themeInUseEnter").mode).toBe("dark:cyber");
    });

    /** A theme the redesign dropped must not leave the account themeless. */
    it("falls back to the default for an unknown mode", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user({ themeInUse: "SomeThemeWeDeleted" }));

        const theme = payloadOf(dispatch, "perfil/themeInUseEnter");
        expect(theme.mode).toBe("system:beyou");
        expect(theme.accentPack).toBe("beyou");
    });

    it("sends null when the account has no theme yet", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user({ themeInUse: undefined }));

        expect(payloadOf(dispatch, "perfil/themeInUseEnter")).toBeNull();
    });

    it("coerces a missing tutorial flag to false", () => {
        const dispatch = vi.fn();

        hydratePerfil(dispatch, user({ isTutorialCompleted: undefined as never }));

        expect(payloadOf(dispatch, "perfil/tutorialCompletedEnter")).toBe(false);
    });
});
