import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Sparkles } from "lucide-react";
import { aiPrivacyUrl } from "@beyou/i18n";
import setAiConsent from "@beyou/api/user/setAiConsent";
import { aiConsentEnter } from "@beyou/state/user/perfilSlice";
import type { RootState } from "@beyou/state/rootReducer";
import Modal from "../modals/Modal";
import Button from "../Button";
import { notify } from "../../lib/notify";
import { onAiConsentOpen } from "./aiConsentBus";

const WHAT_IS_SENT = [
    "AiConsentWhatMessages",
    "AiConsentWhatItems",
    "AiConsentWhatProfile",
    "AiConsentWhatBriefing",
] as const;

/**
 * Asks, once, whether Beyou may send the person's data to its AI provider: who receives it,
 * what is sent, Allow / Don't allow. The web twin of the phone's `app/ai-consent.tsx`.
 *
 * Mounted once in `ProtectedRoute`. It opens by itself while the account was never asked
 * (`aiConsent` UNASKED) and cannot be dismissed without an answer, because until then the
 * server refuses every AI feature; Configuration and the assistant open it again later through
 * `openAiConsent`, and then it can be closed.
 */
export default function AiConsentGate() {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const titleId = useId();
    const consent = useSelector((state: RootState) => state.perfil.aiConsent);
    const [requested, setRequested] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => onAiConsentOpen(() => setRequested(true)), []);

    const mustAnswer = consent === "UNASKED";
    const open = mustAnswer || requested;

    const respond = async (granted: boolean) => {
        setSaving(true);
        const res = await setAiConsent(granted);
        setSaving(false);
        if (res.error || !res.data) {
            notify.error(t("AiConsentSaveFailed"));
            return;
        }
        dispatch(aiConsentEnter(res.data.aiConsent ?? (granted ? "GRANTED" : "DECLINED")));
        setRequested(false);
    };

    return (
        <Modal
            isOpen={open}
            onClose={mustAnswer || saving ? () => {} : () => setRequested(false)}
            labelledBy={titleId}
            className="max-w-lg"
        >
            <div className="flex flex-col gap-4 text-text" data-testid="ai-consent-dialog">
                <div className="flex h-11 w-11 items-center justify-center rounded-card bg-accent-soft text-accent">
                    <Sparkles size={20} aria-hidden="true" />
                </div>
                <h1 id={titleId} className="text-lg font-semibold tracking-[-0.01em]">
                    {t("AiConsentTitle")}
                </h1>
                <p className="text-sm leading-relaxed text-text-2">{t("AiConsentIntro")}</p>

                <section>
                    <h2 className="mb-1 text-[13px] font-semibold">{t("AiConsentWhoTitle")}</h2>
                    <p className="text-sm leading-relaxed text-text-2" data-testid="ai-consent-who">
                        {t("AiConsentWho")}
                    </p>
                </section>

                <section>
                    <h2 className="mb-1 text-[13px] font-semibold">{t("AiConsentWhatTitle")}</h2>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-2">
                        {WHAT_IS_SENT.map((key) => (
                            <li key={key}>{t(key)}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-sm font-semibold text-text-2">{t("AiConsentNeverSent")}</p>
                </section>

                <p className="text-xs leading-relaxed text-text-3">{t("AiConsentTerms")}</p>
                <a
                    href={aiPrivacyUrl(i18n.language)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent hover:underline"
                >
                    {t("AiConsentPolicyLink")}
                </a>

                <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        text={t("AiConsentDecline")}
                        mode="default"
                        size="medium"
                        type="button"
                        disabled={saving}
                        onClick={() => respond(false)}
                        testId="ai-consent-decline"
                    />
                    <Button
                        text={t("AiConsentAllow")}
                        mode="primary"
                        size="medium"
                        type="button"
                        disabled={saving}
                        onClick={() => respond(true)}
                        testId="ai-consent-allow"
                    />
                </div>
                <p className="text-center text-xs text-text-3 sm:text-right">{t("AiConsentDeclineNote")}</p>
            </div>
        </Modal>
    );
}
