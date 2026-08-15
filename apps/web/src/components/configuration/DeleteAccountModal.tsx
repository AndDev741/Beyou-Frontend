import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RootState } from "@beyou/state/rootReducer";
import deleteAccount from "@beyou/api/user/deleteAccount";
import requestAccountDeletionCode from "@beyou/api/user/requestAccountDeletionCode";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import Button from "../Button";
import Modal from "../modals/Modal";
import { persistor } from "../../redux/store";

type Step = "confirm" | "code" | "goodbye";

/**
 * Deleting an account, in three deliberate steps: say it out loud, prove the inbox
 * is yours, and then say goodbye.
 *
 * The code is only spent at the very end. There is no endpoint that checks a code
 * without also deleting the account — deliberately, since one that did would be a
 * free oracle for guessing — so a wrong code surfaces on the last press and sends
 * the user back to the code step with the reason.
 */
export default function DeleteAccountModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const codeId = useId();
    const email = useSelector((state: RootState) => state.perfil.email);
    const [step, setStep] = useState<Step>("confirm");
    const [code, setCode] = useState("");
    const [pending, setPending] = useState(false);

    // Every opening starts at the beginning: a half-finished deletion left on screen
    // is not a state anyone should be able to come back to.
    useEffect(() => {
        if (isOpen) {
            setStep("confirm");
            setCode("");
            setPending(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const askForCode = async (resending = false) => {
        setPending(true);
        const response = await requestAccountDeletionCode();
        setPending(false);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        if (resending) {
            toast.success(t("DeleteAccountCodeSent"));
        }
        setStep("code");
    };

    const confirmDeletion = async () => {
        setPending(true);
        const response = await deleteAccount(code.trim());
        if (response.error) {
            setPending(false);
            toast.error(getFriendlyErrorMessage(t, response.error));
            // Back to the code step: every failure here is about the code.
            setStep("code");
            return;
        }
        toast.success(t("DeleteAccountDone"));
        // The account is gone and the cookie with it; anything still in redux-persist
        // would greet the next person to open this browser.
        await persistor.purge();
        window.location.href = "/";
    };

    const isCodeComplete = /^\d{6}$/.test(code.trim());

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="max-w-md">
            <div className="text-text">
                {step === "confirm" && (
                    <>
                        <h1 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                            {t("DeleteAccountStep1Title")}
                        </h1>
                        <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                            {t("DeleteAccountStep1Body")}
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                            <Button
                                text={t("DeleteAccountStep1Confirm")}
                                mode="danger"
                                size="medium"
                                type="button"
                                disabled={pending}
                                onClick={() => void askForCode()}
                                testId="delete-account-continue"
                            />
                        </div>
                    </>
                )}

                {step === "code" && (
                    <>
                        <h1 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                            {t("DeleteAccountStep2Title")}
                        </h1>
                        <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                            {t("DeleteAccountStep2Body", { email: email ?? "" })}
                        </p>

                        <label htmlFor={codeId} className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-text-2">
                            {t("DeleteAccountCodeLabel")}
                        </label>
                        <input
                            id={codeId}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                            className="w-full rounded-control border border-border bg-surface px-3 py-2.5 text-center font-mono text-[20px] tracking-[0.4em] text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                            data-testid="delete-account-code"
                        />

                        <button
                            type="button"
                            onClick={() => void askForCode(true)}
                            disabled={pending}
                            className="mt-2 text-[12px] font-semibold text-accent underline-offset-4 hover:underline disabled:opacity-60"
                        >
                            {t("DeleteAccountResend")}
                        </button>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                            <Button
                                text={t("Continue")}
                                mode="danger"
                                size="medium"
                                type="button"
                                disabled={!isCodeComplete || pending}
                                onClick={() => setStep("goodbye")}
                                testId="delete-account-code-continue"
                            />
                        </div>
                    </>
                )}

                {step === "goodbye" && (
                    <>
                        <div className="text-center">
                            <span className="text-[34px]" aria-hidden="true">🥺</span>
                            <h1 id={titleId} className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-text">
                                {t("DeleteAccountStep3Title")}
                            </h1>
                            <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                                {t("DeleteAccountStep3Body")}
                            </p>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                            <Button
                                text={t("DeleteAccountFinalConfirm")}
                                mode="danger"
                                size="medium"
                                type="button"
                                disabled={pending}
                                onClick={() => void confirmDeletion()}
                                testId="delete-account-final"
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
