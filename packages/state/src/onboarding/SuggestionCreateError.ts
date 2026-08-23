/** What the wizard was writing to the account when the server said no. */
export type SuggestionEntityKind =
    | "category"
    | "habit"
    | "task"
    | "routine"
    | "schedule"
    | "goal";

/** i18n keys for each kind, article included ("the habit" / "do hábito"), so the
 *  error copy can name what failed in either language. Kept beside the kind type
 *  because web and mobile both render this error and would otherwise each keep a
 *  copy of the map. */
export const SUGGESTION_KIND_LABEL_KEYS: Record<SuggestionEntityKind, string> = {
    category: "AiOnboardingEntityCategory",
    habit: "AiOnboardingEntityHabit",
    task: "AiOnboardingEntityTask",
    routine: "AiOnboardingEntityRoutine",
    schedule: "AiOnboardingEntitySchedule",
    goal: "AiOnboardingEntityGoal"
};

/**
 * A create call failed while the wizard was turning accepted suggestions into rows.
 *
 * The generic Error this replaces sent every failure to the "AI setup is
 * unavailable" screen, which blamed the model for a rejected POST and told the user
 * a deterministic problem might pass later. This carries what that screen could not
 * say: which entity fell over, the server's reason (already translated), and the
 * accepted names that were safe on the server at that moment.
 *
 * Lives in its own dependency-free module so a test can mock
 * `createFromSuggestions` wholesale and still throw the real class — `instanceof`
 * in the wizards keeps working.
 */
export class SuggestionCreateError extends Error {
    readonly kind: SuggestionEntityKind;
    /** The suggestion the server refused, by the name the user saw. */
    readonly entityName: string;
    /** Accepted names already on the server when the failure hit — written by this
     *  pass or found already there. A retry keeps them and only fills the gap. */
    readonly savedNames: string[];

    constructor(
        kind: SuggestionEntityKind,
        entityName: string,
        message: string,
        savedNames: string[] = []
    ) {
        super(message);
        this.name = "SuggestionCreateError";
        this.kind = kind;
        this.entityName = entityName;
        this.savedNames = savedNames;
        // Keeps `instanceof` truthful when a transpile target downlevels the class.
        Object.setPrototypeOf(this, SuggestionCreateError.prototype);
    }
}
