import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RootState } from "@beyou/state/rootReducer";
import deleteAccount from "@beyou/api/user/deleteAccount";
import requestAccountDeletionCode from "@beyou/api/user/requestAccountDeletionCode";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import Button from "../Button";
import Modal from "../modals/Modal";
import { tearDownAndLeave } from "./accountTeardown";

type Step = "confirm" | "code" | "goodbye";

/**
 * The four refusals that mean "your account is still there, try the code again".
 * Anything else — a dropped connection, a proxy that timed out after the server
 * committed, a tab the phone suspended mid-request — tells us nothing about whether
 * the deletion happened, and the client has to assume it did.
 */
const CODE_ERROR_KEYS = new Set([
    "DELETION_CODE_INVALID",
    "DELETION_CODE_EXPIRED",
    "DELETION_CODE_TOO_MANY_ATTEMPTS",
    "DELETION_CODE_TOO_MANY_REQUESTS",
]);

/**
 * The deletion ran and rolled back. This is the one failure that is definite in the
 * other direction: the account still exists, the code was not spent, and the session
 * was deliberately left alone — the backend revokes the refresh token only after a
 * delete that actually happened. So the only correct response is to stay put and say
 * it did not work. Purging here would empty the browser of an account that is still
 * live, and on a shared device that data belongs to someone who is still using it.
 */
const FAILED_BUT_INTACT = "ACCOUNT_DELETE_FAILED";

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

    if (!isOpen) return null;

    const askForCode = async (resending = false) => {
        setPending(true);
        // Superseded server-side the moment a new one is issued, so the digits still
        // sitting in the field are worthless — and leaving them there lets someone
        // walk all the way to the irreversible button before finding that out.
        if (resending) {
            setCode("");
        }
        const response = await requestAccountDeletionCode();
        setPending(false);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            // Refused for the cooldown means a code was sent recently and is sitting in
            // the inbox right now, perfectly valid. Stopping here would leave the user
            // holding a working code with nowhere to type it.
            if (response.error.errorKey === "DELETION_CODE_TOO_MANY_REQUESTS") {
                setStep("code");
            }
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
            const errorKey = response.error.errorKey ?? "";

            if (errorKey === FAILED_BUT_INTACT) {
                // Stay on the goodbye step: the code is still live, so pressing the
                // button again is the whole recovery.
                setPending(false);
                toast.error(getFriendlyErrorMessage(t, response.error));
                return;
            }

            if (CODE_ERROR_KEYS.has(errorKey)) {
                setPending(false);
                toast.error(getFriendlyErrorMessage(t, response.error));
                setStep("code");
                return;
            }
            // Not about the code, so the account may well be gone — the request can
            // fail on the way back from a server that already committed. Sending the
            // user back to type the code again would ask them to delete an account
            // that no longer exists, and would leave everything the account owned
            // sitting in this browser's storage. Assume the worse case and clean up.
            toast.error(t("DeleteAccountUnclear"));
            await tearDownAndLeave();
            return;
        }
        toast.success(t("DeleteAccountDone"));
        // The account is gone and the cookie with it; anything still in redux-persist
        // would greet the next person to open this browser.
        await tearDownAndLeave();
    };

    const isCodeComplete = /^\d{6}$/.test(code.trim());

    // Backdrop and Escape are wired to onClose inside Modal. Neither cancels the
    // request that is already out, so while one is in flight they would only close the
    // dialog over the top of a deletion that carries on and completes.
    const closeWhenIdle = pending ? () => {} : onClose;

    return (
        <Modal isOpen={isOpen} onClose={closeWhenIdle} labelledBy={titleId} className="max-w-md">
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
                            {/* The address is how someone knows which inbox to open, so a
                                missing one has to change the sentence rather than leave a
                                gap in it. */}
                            {email
                                ? t("DeleteAccountStep2Body", { email })
                                : t("DeleteAccountStep2BodyNoEmail")}
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
                            <Button
                                text={t("Cancel")}
                                mode="ghost"
                                size="medium"
                                type="button"
                                disabled={pending}
                                onClick={onClose}
                            />
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
