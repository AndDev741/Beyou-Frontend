import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../Button";

/**
 * Ask for today's Daily Briefing back.
 *
 * It exists for one mistake: the dialog is dismissed with a click, and a click near the edge
 * of a modal is easy to make before you have read it. Everything else about the feature is
 * built to stop it appearing unasked, so there was no way back in until now.
 *
 * Reopening does NOT clear the server's `seenAt`. That column records that the day was
 * acknowledged, which stays true; this is a request to look again, and it is answered by
 * sending the user to the dashboard with the dialog forced open. Clearing the column would
 * also reopen the dialog on the user's other devices, which nobody asked for.
 *
 * "if there is one" in the copy is doing real work: an account with nothing open, nothing
 * scheduled and no goal near due has no briefing, and the honest answer to asking for it is
 * the dashboard rather than an empty modal.
 */
export default function BriefingConfiguration() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="w-full">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                {t("DailyBriefingTitle")}
            </h3>
            <p className="mb-3 text-xs text-text-3">{t("BriefingConfigDescription")}</p>

            <div className="mt-2.5 flex justify-end">
                <Button
                    text={t("BriefingConfigShowAgain")}
                    mode="tonal"
                    size="small"
                    type="button"
                    onClick={() => navigate("/dashboard?briefing=1")}
                    testId="briefing-show-again"
                />
            </div>
        </div>
    );
}
