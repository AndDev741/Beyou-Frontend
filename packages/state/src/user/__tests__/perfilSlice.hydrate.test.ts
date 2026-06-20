import { describe, expect, it } from "vitest";
import reducer, { hydratePerfil } from "../perfilSlice";

describe("perfilSlice hydratePerfil", () => {
  it("maps UserType fields onto the perfil state", () => {
    const state = reducer(
      undefined,
      hydratePerfil({
        name: "Alice",
        email: "a@b.com",
        constance: 7,
        photo: "p.png",
        widgetsId: ["constance"],
        xp: 100,
        level: 3,
        nextLevelXp: 120,
        actualLevelXp: 80,
        maxConstance: 9,
        constanceIncreaseToday: true,
        languageInUse: "pt",
        isTutorialCompleted: true,
        timezone: "America/Sao_Paulo",
        xpDecayStrategy: "FLAT",
      }),
    );

    expect(state.username).toBe("Alice");
    expect(state.email).toBe("a@b.com");
    expect(state.constance).toBe(7);
    expect(state.widgetsIdsInUse).toEqual(["constance"]);
    expect(state.alreadyIncreaseConstanceToday).toBe(true);
    expect(state.xp).toBe(100);
    expect(state.level).toBe(3);
    expect(state.timezone).toBe("America/Sao_Paulo");
    expect(state.xpDecayStrategy).toBe("FLAT");
  });

  it("leaves existing fields at their defaults for a partial payload", () => {
    const state = reducer(undefined, hydratePerfil({ name: "Bob" }));
    expect(state.username).toBe("Bob");
    expect(state.xp).toBe(0);
    expect(state.level).toBe(0);
  });
});
