import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import unsubscribe from "@beyou/api/notification/unsubscribe";
import AuthShell from "../../components/authentication/AuthShell";

type UnsubscribeState = "loading" | "success" | "error";

const actionLink =
    "mt-6 inline-flex items-center justify-center rounded-control bg-accent px-6 py-2.5 " +
    "text-sm font-semibold text-on-accent transition-opacity duration-200 hover:opacity-90";

/**
 * Where an unsubscribe link lands.
 *
 * The mail links here rather than straight at the API, and that indirection is the whole
 * design: mail clients prefetch links to build previews and scan for malware, so a
 * state-changing GET gets "clicked" by a robot and unsubscribes people who merely opened
 * the message. A page that POSTs on mount cannot be triggered by a prefetch, because a
 * prefetch does not run scripts.
 *
 * It acts immediately rather than showing a "click to confirm" button. The intent is not
 * in doubt — nobody opens an unsubscribe link by accident — and a second click is one
 * more thing between somebody and the thing they already asked for.
 *
 * No session is involved. The token is the entire proof of ownership, which is what makes
 * this work for the population these mails are aimed at: accounts that stopped opening
 * the app and would have to remember a password to make the mail stop.
 */
export default function Unsubscribe() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [state, setState] = useState<UnsubscribeState>("loading");
    // React 18 StrictMode mounts effects twice in development. The endpoint is
    // idempotent, so a double call is harmless, but it would double the log line and the
    // rate-limit spend for no reason.
    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        if (!token) {
            setState("error");
            return;
        }

        void unsubscribe(token).then((response) => {
            setState(response.success ? "success" : "error");
        });
    }, [token]);

    const heading = () => {
        switch (state) {
            case "loading":
                return { title: t("UnsubscribeLoading"), subtitle: undefined };
            case "success":
                return { title: t("UnsubscribeSuccessTitle"), subtitle: t("UnsubscribeSuccessMessage") };
            default:
                return { title: t("UnsubscribeErrorTitle"), subtitle: t("UnsubscribeErrorMessage") };
        }
    };

    const mark = () => {
        if (state === "loading") {
            return (
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-transparent" />
            );
        }

        const tone = state === "success" ? "success" : "danger";
        return (
            <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                    tone === "success" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                }`}
            >
                <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                >
                    {state === "success" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    )}
                </svg>
            </div>
        );
    };

    const { title, subtitle } = heading();

    return (
        <AuthShell variant="status" icon={mark()} title={title} subtitle={subtitle}>
            <div className="flex flex-col items-center text-center" data-testid={`unsubscribe-${state}`}>
                {state === "success" && (
                    <p className="text-[13px] text-text-3">{t("UnsubscribeTransactionalNote")}</p>
                )}

                {state !== "loading" && (
                    <Link to="/" className={actionLink}>
                        {t("Enter")}
                    </Link>
                )}
            </div>
        </AuthShell>
    );
}
