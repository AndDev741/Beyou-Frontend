import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import setAiConsent from "@beyou/api/user/setAiConsent";
import { aiConsentEnter } from "@beyou/state/user/perfilSlice";
import type { RootState } from "@beyou/state/rootReducer";
import Button from "../Button";
import { notify } from "../../lib/notify";
import { openAiConsent } from "../aiConsent/aiConsentBus";

/**
 * Where the answer about the AI provider is changed. The web twin of the phone's
 * `AiConsentSection`: off in one click, on only through the consent dialog, so a yes is never
 * given without the list of who receives what in front of the person.
 */
export default function AiConsentConfiguration() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const consent = useSelector((state: RootState) => state.perfil.aiConsent);
    const [saving, setSaving] = useState(false);

    // A backend that does not know the field: there is nothing to change.
    if (!consent) return null;
    const on = consent === "GRANTED";

    const turnOff = async () => {
        setSaving(true);
        const res = await setAiConsent(false);
        setSaving(false);
        if (res.error || !res.data) {
            notify.error(t("AiConsentSaveFailed"));
            return;
        }
        dispatch(aiConsentEnter(res.data.aiConsent ?? "DECLINED"));
        notify.success(t("AiConfigTurnedOff"));
    };

    return (
        <div className="w-full" data-testid="ai-consent-configuration">
            <h3 className="mb-1.5 block text-[12.5px] font-semibold text-text-2">{t("AiConfigTitle")}</h3>
            <p className="mb-3 text-xs text-text-3" data-testid="ai-consent-state">
                {t(on ? "AiConfigOn" : "AiConfigOff")}
            </p>
            <div className="mt-2.5 flex justify-end">
                <Button
                    text={t(on ? "AiConfigTurnOff" : "AiConfigTurnOn")}
                    mode={on ? "default" : "tonal"}
                    size="small"
                    type="button"
                    disabled={saving}
                    onClick={on ? turnOff : openAiConsent}
                    testId={on ? "ai-consent-turn-off" : "ai-consent-turn-on"}
                />
            </div>
        </div>
    );
}
