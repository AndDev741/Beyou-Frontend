import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RootState } from "../../redux/rootReducer";
import { timezoneEnter, xpDecayStrategyEnter } from "../../redux/user/perfilSlice";
import editUser from "../../services/user/editUser";
import { getFriendlyErrorMessage } from "../../services/apiError";
import SmallButton from "../SmallButton";

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
    const currentXpDecay = useSelector((state: RootState) => state.perfil.xpDecayStrategy) ?? "GRADUAL";

    const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
    const [selectedXpDecay, setSelectedXpDecay] = useState<XpDecayStrategy>(currentXpDecay);
    const [timezoneSearch, setTimezoneSearch] = useState("");
    const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const detectedTimezone = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return null;
        }
    }, []);

    const showTimezoneSuggestion =
        detectedTimezone &&
        currentTimezone === "UTC" &&
        selectedTimezone === "UTC" &&
        detectedTimezone !== "UTC";

    const filteredTimezones = useMemo(() => {
        if (!timezoneSearch.trim()) return commonTimezones;
        const search = timezoneSearch.toLowerCase();
        return commonTimezones.filter((tz) =>
            tz.toLowerCase().includes(search)
        );
    }, [timezoneSearch]);

    const handleTimezoneSelect = useCallback((tz: string) => {
        setSelectedTimezone(tz);
        setTimezoneSearch("");
        setIsTimezoneOpen(false);
        setError("");
        setSuccess("");
    }, []);

    const handleXpDecaySelect = useCallback((strategy: XpDecayStrategy) => {
        setSelectedXpDecay(strategy);
        setError("");
        setSuccess("");
    }, []);

    const handleAcceptDetectedTimezone = useCallback(() => {
        if (detectedTimezone) {
            handleTimezoneSelect(detectedTimezone);
        }
    }, [detectedTimezone, handleTimezoneSelect]);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        const response = await editUser({
            timezone: selectedTimezone,
            xpDecayStrategy: selectedXpDecay,
        });

        if (response.error) {
            const friendlyMessage = getFriendlyErrorMessage(t, response.error);
            setError(friendlyMessage);
            toast.error(friendlyMessage);
        } else {
            dispatch(timezoneEnter(selectedTimezone));
            dispatch(xpDecayStrategyEnter(selectedXpDecay));
            setSuccess(t("RoutineSettingsSaved"));
            toast.success(t("RoutineSettingsSaved"));
        }

        setSaving(false);
    };

    const hasChanges =
        selectedTimezone !== currentTimezone ||
        selectedXpDecay !== currentXpDecay;

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-background text-secondary">
            <h2 className="text-2xl font-semibold mb-2">
                {t("RoutineSettingsTitle")}
            </h2>
            <p className="text-sm text-description mb-4">
                {t("RoutineSettingsDescription")}
            </p>

            {/* Timezone Selector */}
            <div className="w-full mb-6">
                <label className="mb-1 font-medium text-lg text-secondary block">
                    {t("TimezoneLabel")}
                </label>

                {showTimezoneSuggestion && (
                    <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                        <p className="text-sm text-description mb-2">
                            {t("TimezoneSuggestion", {
                                timezone: detectedTimezone,
                            })}
                        </p>
                        <button
                            type="button"
                            onClick={handleAcceptDetectedTimezone}
                            className="text-sm font-medium text-primary hover:text-primary/80 underline transition duration-150"
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
                        className="w-full border border-primary rounded-md pl-3 pr-8 py-2 text-left bg-background text-secondary hover:border-primary/80 transition-colors duration-200"
                        aria-haspopup="listbox"
                        aria-expanded={isTimezoneOpen}
                        aria-label={t("TimezoneLabel")}
                    >
                        {selectedTimezone}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-description">
                            {isTimezoneOpen ? "\u25B2" : "\u25BC"}
                        </span>
                    </button>

                    {isTimezoneOpen && (
                        <div className="absolute z-10 w-full mt-1 border border-primary/30 rounded-md bg-background shadow-lg max-h-60 overflow-hidden">
                            <div className="p-2 border-b border-primary/20">
                                <input
                                    type="text"
                                    value={timezoneSearch}
                                    onChange={(e) =>
                                        setTimezoneSearch(e.target.value)
                                    }
                                    placeholder={t(
                                        "TimezoneSearchPlaceholder"
                                    )}
                                    className="w-full border border-primary/30 rounded-md pl-2 py-1 outline-none bg-background text-secondary placeholder:text-placeholder text-sm"
                                    autoFocus
                                />
                            </div>
                            <ul
                                className="overflow-y-auto max-h-48"
                                role="listbox"
                                aria-label={t("TimezoneLabel")}
                            >
                                {filteredTimezones.length === 0 ? (
                                    <li className="px-3 py-2 text-sm text-description italic">
                                        No timezones found
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
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "hover:bg-primary/5 text-secondary"
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
                <label className="mb-1 font-medium text-lg text-secondary block">
                    {t("XpDecayLabel")}
                </label>
                <p className="text-sm text-description mb-3">
                    {t("XpDecayDescription")}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    {xpDecayOptions.map((option) => {
                        const isActive = selectedXpDecay === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                    handleXpDecaySelect(option.id)
                                }
                                className={`
                                    relative text-left rounded-lg border p-4 transition-all duration-200 h-full
                                    ${
                                        isActive
                                            ? "border-primary bg-primary/10 shadow-md"
                                            : "border-primary/20 hover:border-primary/60"
                                    }
                                `}
                                aria-pressed={isActive}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-lg font-semibold">
                                        {t(option.titleKey)}
                                    </p>
                                    <div
                                        className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${
                                            isActive
                                                ? "border-primary bg-primary"
                                                : "border-description"
                                        }`}
                                        aria-hidden="true"
                                    />
                                </div>
                                <p className="text-xs text-description">
                                    {t(option.descriptionKey)}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col items-center justify-center w-full">
                <SmallButton
                    text={saving ? t("Saving...") : t("Save")}
                    disabled={saving || !hasChanges}
                    onClick={handleSave}
                />
                <span className="text-xs text-success mt-1">{success}</span>
                <span className="text-xs text-error">{error}</span>
            </div>
        </div>
    );
}
