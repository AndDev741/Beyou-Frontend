import { useState } from "react";
import { useTranslation } from "react-i18next";
import editUser from "@beyou/api/user/editUser";
import { EditUser } from "@beyou/types/user/EditUser";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";

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
        handleSave(mode);
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
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("ConstanceTitle")}</h3>
            <p className="mb-3 text-xs text-text-3">
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
                            disabled={saving}
                            className={`
                                relative text-left rounded-control border p-4 transition-all duration-200 h-full
                                ${isActive ? "border-accent bg-accent/10 shadow-md" : "border-border hover:border-border"}
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-[13.5px] font-semibold text-text">{t(option.title)}</p>
                                    <p className="mt-0.5 text-xs text-text-3">{t(option.description)}</p>
                                </div>
                                <div
                                    className={`absolute right-3 top-3 h-5 w-5 rounded-full border-2 ${
                                        isActive ? "border-accent bg-accent" : "border-border"
                                    }`}
                                    aria-label={option.title}
                                />
                            </div>
                            <p className="text-xs text-text-2">{t(option.detail)}</p>
                        </button>
                    );
                })}
            </div>

            {success && <span className="mt-2 block text-xs text-success">{success}</span>}
            {error && <span className="mt-2 block text-xs text-danger">{error}</span>}
        </div>
    );
}
