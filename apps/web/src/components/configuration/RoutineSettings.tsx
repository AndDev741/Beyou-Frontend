import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RootState } from "@beyou/state/rootReducer";
import { timezoneEnter, timezoneSourceEnter, xpDecayStrategyEnter } from "@beyou/state/user/perfilSlice";
import { detectTimezone } from "../../services/user/reconcileTimezone";
import editUser from "@beyou/api/user/editUser";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";

type XpDecayStrategy = "GRADUAL" | "FLAT" | "TIME_WINDOW";

const commonTimezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "America/Buenos_Aires",
    "America/Bogota",
    "America/Mexico_City",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Lisbon",
    "Europe/Moscow",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Asia/Dubai",
    "Asia/Singapore",
    "Australia/Sydney",
    "Pacific/Auckland",
];

const xpDecayOptions: Array<{
    id: XpDecayStrategy;
    titleKey: string;
    descriptionKey: string;
}> = [
    {
        id: "GRADUAL",
        titleKey: "Gradual",
        descriptionKey: "Gradual description",
    },
    {
        id: "FLAT",
        titleKey: "Flat",
        descriptionKey: "Flat description",
    },
    {
        id: "TIME_WINDOW",
        titleKey: "Time Window",
        descriptionKey: "Time Window description",
    },
];

export default function RoutineSettings() {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const currentTimezone = useSelector((state: RootState) => state.perfil.timezone) ?? "UTC";
    const currentTimezoneSource =
        useSelector((state: RootState) => state.perfil.timezoneSource) ?? "DEFAULT";
    const currentXpDecay = useSelector((state: RootState) => state.perfil.xpDecayStrategy) ?? "GRADUAL";

    const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
    const [selectedXpDecay, setSelectedXpDecay] = useState<XpDecayStrategy>(currentXpDecay);
    const [timezoneSearch, setTimezoneSearch] = useState("");
    const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const detectedTimezone = useMemo(() => detectTimezone(), []);

    // Gated on the SOURCE, not on the string. `currentTimezone === "UTC"` only ever
    // offered this to someone already broken, and said nothing to a user who moved: the
    // boot reconcile now fixes the UTC case on its own, so what is left for this
    // affordance is exactly the mismatch nothing may decide automatically. An EXPLICIT
    // pick is never questioned.
    const showTimezoneSuggestion =
        Boolean(detectedTimezone) &&
        currentTimezoneSource !== "EXPLICIT" &&
        detectedTimezone !== currentTimezone &&
        detectedTimezone !== selectedTimezone;

    const filteredTimezones = useMemo(() => {
        if (!timezoneSearch.trim()) return commonTimezones;
        const search = timezoneSearch.toLowerCase();
        return commonTimezones.filter((tz) =>
            tz.toLowerCase().includes(search)
        );
    }, [timezoneSearch]);

    const saveRef = useRef<(tz?: string, decay?: XpDecayStrategy) => void>(() => {});

    const handleTimezoneSelect = useCallback((tz: string) => {
        setSelectedTimezone(tz);
        setTimezoneSearch("");
        setIsTimezoneOpen(false);
        setError("");
        setSuccess("");
        saveRef.current(tz, undefined);
    }, []);

    const handleXpDecaySelect = useCallback((strategy: XpDecayStrategy) => {
        setSelectedXpDecay(strategy);
        setError("");
        setSuccess("");
        saveRef.current(undefined, strategy);
    }, []);

    const handleAcceptDetectedTimezone = useCallback(() => {
        if (detectedTimezone) {
            handleTimezoneSelect(detectedTimezone);
        }
    }, [detectedTimezone, handleTimezoneSelect]);

    // Every choice writes itself: only the profile has a save button. The timezone
    // and the strategy are single choices, so there is no "half filled in".
    const handleSave = async (
        timezone: string = selectedTimezone,
        xpDecayStrategy: typeof selectedXpDecay = selectedXpDecay
    ) => {
        setSaving(true);
        setError("");
        setSuccess("");

        const response = await editUser({
            timezone,
            xpDecayStrategy,
        });

        if (response?.error) {
            const friendlyMessage = getFriendlyErrorMessage(t, response.error);
            setError(friendlyMessage);
            toast.error(friendlyMessage);
        } else {
            dispatch(timezoneEnter(timezone));
            // No timezoneSource on the request: this came from the picker, so the backend
            // reads it as a person's choice and makes it permanent.
            dispatch(timezoneSourceEnter("EXPLICIT"));
            dispatch(xpDecayStrategyEnter(xpDecayStrategy));
            setSuccess(t("RoutineSettingsSaved"));
            toast.success(t("RoutineSettingsSaved"));
        }

        setSaving(false);
    };

    saveRef.current = (tz?: string, decay?: XpDecayStrategy) => {
        void handleSave(tz ?? selectedTimezone, decay ?? selectedXpDecay);
    };

    return (
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("RoutineSettingsTitle")}</h3>
            <p className="mb-3 text-xs text-text-3">
                {t("RoutineSettingsDescription")}
            </p>

            {/* Timezone Selector */}
            <div className="w-full mb-6">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                    {t("TimezoneLabel")}
                </label>

                {showTimezoneSuggestion && (
                    <div className="mb-3 p-3 rounded-control border border-border bg-accent/5">
                        <p className="mb-2 text-xs text-text-3">
                            {t("TimezoneSuggestion", {
                                timezone: detectedTimezone,
                            })}
                        </p>
                        <button
                            type="button"
                            onClick={handleAcceptDetectedTimezone}
                            className="text-sm font-medium text-accent hover:text-accent/80 underline transition duration-150"
                        >
                            {t("UseDetectedTimezone", {
                                timezone: detectedTimezone,
                            })}
                        </button>
                    </div>
                )}

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsTimezoneOpen(!isTimezoneOpen)}
                        className="w-full border border-border rounded-control pl-3 pr-8 py-2 text-left bg-surface text-text hover:border-border transition-colors duration-200"
                        aria-haspopup="listbox"
                        aria-expanded={isTimezoneOpen}
                        aria-label={t("TimezoneLabel")}
                    >
                        {selectedTimezone}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-2">
                            {isTimezoneOpen ? "\u25B2" : "\u25BC"}
                        </span>
                    </button>

                    {isTimezoneOpen && (
                        <div className="absolute z-10 w-full mt-1 border border-border rounded-control bg-surface shadow-lg max-h-60 overflow-hidden">
                            <div className="p-2 border-b border-border">
                                <input
                                    type="text"
                                    value={timezoneSearch}
                                    onChange={(e) =>
                                        setTimezoneSearch(e.target.value)
                                    }
                                    placeholder={t(
                                        "TimezoneSearchPlaceholder"
                                    )}
                                    className="w-full border border-border rounded-control pl-2 py-1 outline-none bg-surface text-text placeholder:text-text-3 text-sm"
                                    autoFocus
                                />
                            </div>
                            <ul
                                className="overflow-y-auto max-h-48"
                                role="listbox"
                                aria-label={t("TimezoneLabel")}
                            >
                                {filteredTimezones.length === 0 ? (
                                    <li className="px-3 py-2 text-sm text-text-2 italic">
                                        {t("No timezones found")}
                                    </li>
                                ) : (
                                    filteredTimezones.map((tz) => (
                                        <li
                                            key={tz}
                                            role="option"
                                            aria-selected={
                                                selectedTimezone === tz
                                            }
                                            onClick={() =>
                                                handleTimezoneSelect(tz)
                                            }
                                            className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-150
                                                ${
                                                    selectedTimezone === tz
                                                        ? "bg-accent/10 text-accent font-medium"
                                                        : "hover:bg-accent/5 text-text"
                                                }`}
                                        >
                                            {tz}
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* XP Decay Strategy Selector */}
            <div className="w-full mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                    {t("XpDecayLabel")}
                </label>
                <p className="mb-2 text-xs text-text-3">
                    {t("XpDecayDescription")}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    {xpDecayOptions.map((option) => {
                        const isActive = selectedXpDecay === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleXpDecaySelect(option.id)}
                                disabled={saving}
                                className={`
                                    relative text-left rounded-control border p-4 transition-all duration-200 h-full
                                    ${
                                        isActive
                                            ? "border-accent bg-accent/10 shadow-md"
                                            : "border-border hover:border-border"
                                    }
                                `}
                                aria-pressed={isActive}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[13.5px] font-semibold text-text">
                                        {t(option.titleKey)}
                                    </p>
                                    <div
                                        className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${
                                            isActive
                                                ? "border-accent bg-accent"
                                                : "border-border"
                                        }`}
                                        aria-hidden="true"
                                    />
                                </div>
                                <p className="text-xs text-text-2">
                                    {t(option.descriptionKey)}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {success && <span className="mt-2 block text-xs text-success">{success}</span>}
            {error && <span className="mt-2 block text-xs text-danger">{error}</span>}
        </div>
    );
}
