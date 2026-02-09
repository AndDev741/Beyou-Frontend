import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import editUser from "../../services/user/editUser";
import { getFriendlyErrorMessage } from "../../services/apiError";
import { RootState } from "../../redux/rootReducer";
import { tutorialCompletedEnter } from "../../redux/user/perfilSlice";
import SmallButton from "../SmallButton";

export default function TutorialConfiguration() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleRestart = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        const response = await editUser({ isTutorialCompleted: false });
        if (response.error) {
            const message = getFriendlyErrorMessage(t, response.error);
            setError(message);
            toast.error(message);
        } else {
            dispatch(tutorialCompletedEnter(false));
            setSuccess(t("TutorialRestarted"));
            toast.success(t("TutorialRestarted"));
        }
        setSaving(false);
    };

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-background text-secondary">
            <h2 className="text-2xl font-semibold mb-2">{t("Tutorial")}</h2>
            <p className="text-sm text-description mb-4">{t("TutorialDescription")}</p>

            <div className="flex items-center justify-between w-full mb-4">
                <span className="text-sm text-description">
                    {t("TutorialStatus")}:{" "}
                    <span className={isTutorialCompleted ? "text-success" : "text-description"}>
                        {isTutorialCompleted ? t("TutorialStatusCompleted") : t("TutorialStatusPending")}
                    </span>
                </span>
            </div>

            <div className="flex flex-col items-center justify-center w-full">
                <SmallButton
                    text={saving ? t("Saving...") : t("TutorialRestart")}
                    disabled={saving}
                    onClick={handleRestart}
                />
                <span className="text-xs text-success mt-1">{success}</span>
                <span className="text-xs text-error">{error}</span>
            </div>
        </div>
    );
}
