import { useState } from "react";
import SmallButton from "../SmallButton";
import { useTranslation } from "react-i18next";
import editUser from "../../services/user/editUser";
import { EditUser } from "../../types/user/EditUser";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";

type ConstanceMode = "ANY" | "COMPLETE";

type ConstanceConfigurationProps = {
    initialMode?: ConstanceMode;
};

const options: Array<{
    id: ConstanceMode;
    title: string;
    description: string;
    detail: string;
}> = [
    {
        id: "ANY",
        title: "ConstanceOptionTaskTitle",
        description: "ConstanceOptionTaskDescription",
        detail: "ConstanceOptionTaskDetail",
    },
    {
        id: "COMPLETE",
        title: "ConstanceOptionRoutineTitle",
        description: "ConstanceOptionRoutineDescription",
        detail: "ConstanceOptionRoutineDetail",
    },
];

export default function ConstanceConfiguration({
    initialMode = "ANY",
}: ConstanceConfigurationProps) {
    const { t } = useTranslation();
    const [selectedMode, setSelectedMode] = useState<ConstanceMode>(initialMode);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleSelect = (mode: ConstanceMode) => {
        setSelectedMode(mode);
        setError("");
        setSuccess("");
    };

    const handleSave = async (config: "ANY" | "COMPLETE") => {
        setSaving(true);
        setError("");
        setSuccess("");

        const editUserRequest: EditUser = {
            constanceConfiguration: config
        }

        const userResponse = await editUser(editUserRequest);

        if (userResponse?.error) {
            const friendlyMessage = getFriendlyErrorMessage(t, userResponse.error);
            setError(friendlyMessage);
            toast.error(friendlyMessage);
        } else {
            setSuccess(t("SettingsSaved"));
            toast.success(t("SettingsSaved"));
        }
        
        setSaving(false);
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

            <div className="flex flex-col items-center justify-center  w-full">
                <SmallButton text={saving ? t("Saving...") : t("Save")} disabled={saving} onClick={() => handleSave(selectedMode)} />
                <span className="text-xs text-success mt-1">{success}</span>
                <span className="text-xs text-error">{error}</span>
            </div>
        </div>
    );
}
