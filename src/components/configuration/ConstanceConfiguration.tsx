import { useState } from "react";
import SmallButton from "../SmallButton";
import { useTranslation } from "react-i18next";

type ConstanceMode = "single-task" | "routine-complete";

type ConstanceConfigurationProps = {
    initialMode?: ConstanceMode;
    onSave?: (mode: ConstanceMode) => void;
};

const options: Array<{
    id: ConstanceMode;
    title: string;
    description: string;
    detail: string;
}> = [
    {
        id: "single-task",
        title: "ConstanceOptionTaskTitle",
        description: "ConstanceOptionTaskDescription",
        detail: "ConstanceOptionTaskDetail",
    },
    {
        id: "routine-complete",
        title: "ConstanceOptionRoutineTitle",
        description: "ConstanceOptionRoutineDescription",
        detail: "ConstanceOptionRoutineDetail",
    },
];

export default function ConstanceConfiguration({
    initialMode = "single-task",
    onSave,
}: ConstanceConfigurationProps) {
    const { t } = useTranslation();
    const [selectedMode, setSelectedMode] = useState<ConstanceMode>(initialMode);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<string>("");

    const handleSelect = (mode: ConstanceMode) => {
        setSelectedMode(mode);
        setFeedback("");
    };

    const handleSave = () => {
        setSaving(true);
        setFeedback("");
        onSave?.(selectedMode);
        // No backend wired yet; optimistic UI feedback.
        setTimeout(() => {
            setSaving(false);
            setFeedback(t("ConstanceSaveFeedback"));
        }, 200);
    };

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-background text-secondary">
            <h2 className="text-2xl font-semibold mb-2">{t("ConstanceTitle")}</h2>
            <p className="text-sm text-description mb-4">
                {t("ConstanceDescription")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mb-4">
                {options.map((option) => {
                    const isActive = selectedMode === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelect(option.id)}
                            className={`
                                relative text-left rounded-lg border p-4 transition-all duration-200 h-full
                                ${isActive ? "border-primary bg-primary/10 shadow-md" : "border-primary/20 hover:border-primary/60"}
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-lg font-semibold">{t(option.title)}</p>
                                    <p className="text-sm text-description">{t(option.description)}</p>
                                </div>
                                <div
                                    className={`absolute right-3 top-3 h-5 w-5 rounded-full border-2 ${
                                        isActive ? "border-primary bg-primary" : "border-description"
                                    }`}
                                    aria-label={option.title}
                                />
                            </div>
                            <p className="text-xs text-description">{t(option.detail)}</p>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-3 w-full">
                <SmallButton text={saving ? t("Saving...") : t("Save")} disabled={saving} onClick={handleSave} />
                <span className="text-xs text-description">{feedback}</span>
            </div>
        </div>
    );
}
