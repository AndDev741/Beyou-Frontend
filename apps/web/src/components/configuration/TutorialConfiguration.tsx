import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import editUser from "@beyou/api/user/editUser";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { RootState } from "@beyou/state/rootReducer";
import { tutorialCompletedEnter } from "@beyou/state/user/perfilSlice";
import Button from "../Button";
import { clearTutorialPhase } from "../tutorial/tutorialStorage";

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
            clearTutorialPhase();
            setSuccess(t("TutorialRestarted"));
            toast.success(t("TutorialRestarted"));
        }
        setSaving(false);
    };

    return (
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("Tutorial")}</h3>
            <p className="mb-3 text-xs text-text-3">{t("TutorialDescription")}</p>

            <div className="flex items-center justify-between w-full mb-4">
                <span className="text-xs text-text-3">
                    {t("TutorialStatus")}:{" "}
                    <span className={isTutorialCompleted ? "text-success" : "text-text-2"}>
                        {isTutorialCompleted ? t("TutorialStatusCompleted") : t("TutorialStatusPending")}
                    </span>
                </span>
            </div>

            {success && <span className="text-xs text-success">{success}</span>}
            {error && <span className="text-xs text-danger">{error}</span>}
            <div className="mt-2.5 flex justify-end">
                <Button
                    text={saving ? t("Saving...") : t("TutorialRestart")}
                    mode="tonal"
                    size="small"
                    type="button"
                    disabled={saving}
                    onClick={handleRestart}
                />
            </div>
        </div>
    );
}
