import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import AuthShell from "../../../components/authentication/AuthShell";
import OpenInAppButton from "../../../components/authentication/OpenInAppButton";
import { isMobileDevice } from "../../../components/utils/openInApp";

type VerifyState = "loading" | "success" | "error" | "expired";

const actionLink =
    "mt-6 inline-flex items-center justify-center rounded-control bg-accent px-6 py-2.5 " +
    "text-sm font-semibold text-on-accent transition-opacity duration-200 hover:opacity-90";

/** The circle behind each state's mark. */
function StatusMark({ tone, children }: { tone: "success" | "danger"; children: React.ReactNode }) {
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
                {children}
            </svg>
        </div>
    );
}

/**
 * What the verification link lands on.
 *
 * This page is nothing but its state, and that is what the layout used to get wrong.
 * `AuthShell` renders the page's single h1 from `title`, and the page was passing the
 * fixed "Check your e-mail" while each state rendered a second h1 of its own. Desktop
 * showed both at once: "Check your e-mail" sitting above "Email verified!", two
 * headings contradicting each other over one green tick, with the first left-aligned
 * against a centred column.
 *
 * The phone was worse than untidy. Its choose-where-to-open screen — shown BEFORE
 * anything is verified, because the token is single-use and the deep link needs it
 * alive — announced "Email verified!" over a button offering to verify.
 *
 * So the title is derived from the state, in one place, and the states no longer carry
 * headings of their own. Whatever the h1 says is what actually happened.
 */
function VerifyEmail() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const mobile = isMobileDevice();
    const [state, setState] = useState<VerifyState>("loading");
    const calledRef = useRef(false);

    const runVerify = useCallback(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        if (!token) {
            setState("error");
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8099";
        axios
            .get(`${apiUrl}/auth/verify-email`, { params: { token } })
            .then(() => setState("success"))
            .catch((err) => {
                if (err.response?.data?.message?.includes("expired")) {
                    setState("expired");
                } else {
                    setState("error");
                }
            });
    }, [token]);

    useEffect(() => {
        // The verification token is single-use. On a phone we defer verifying so
        // the "Open in app" deep link still carries a live token — the user picks
        // app vs browser. On desktop we verify immediately as before.
        if (!token) {
            setState("error");
            return;
        }
        if (mobile) return;
        runVerify();
    }, [token, mobile, runVerify]);

    // The phone's choice screen: the link was opened, nothing has been spent yet.
    const choosing = state === "loading" && mobile && token;

    const heading = () => {
        if (choosing) return { title: t("VerifyEmailChooseTitle"), subtitle: t("VerifyEmailChooseMessage") };
        switch (state) {
            case "loading":
                return { title: t("VerifyEmailLoading"), subtitle: undefined };
            case "success":
                return { title: t("VerifyEmailSuccessTitle"), subtitle: t("VerifyEmailSuccessMessage") };
            case "expired":
                return { title: t("VerifyEmailExpiredTitle"), subtitle: t("VerifyEmailExpiredMessage") };
            default:
                return { title: t("VerifyEmailErrorTitle"), subtitle: t("VerifyEmailErrorMessage") };
        }
    };

    const mark = () => {
        if (choosing) return null;
        switch (state) {
            case "loading":
                return (
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-transparent" />
                );
            case "success":
                return (
                    <StatusMark tone="success">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </StatusMark>
                );
            case "expired":
                return (
                    <StatusMark tone="danger">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </StatusMark>
                );
            default:
                return (
                    <StatusMark tone="danger">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </StatusMark>
                );
        }
    };

    const { title, subtitle } = heading();

    return (
        <AuthShell variant="status" icon={mark()} title={title} subtitle={subtitle}>
            <div className="flex flex-col items-center text-center">
                {choosing && (
                    <div className="mt-6 flex w-full flex-col items-center" data-testid="verify-choose">
                        <OpenInAppButton path="verify" token={token} />
                        <button
                            type="button"
                            onClick={runVerify}
                            className="mt-3 text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
                            data-testid="verify-in-browser"
                        >
                            {t("VerifyInBrowser")}
                        </button>
                    </div>
                )}

                {state === "success" && (
                    <Link to="/" className={actionLink}>
                        {t("Enter")}
                    </Link>
                )}

                {state === "error" && (
                    <Link to="/" className={actionLink}>
                        {t("Enter")}
                    </Link>
                )}

                {state === "expired" && (
                    <Link to="/register" className={actionLink}>
                        {t("ToRegister")}
                    </Link>
                )}
            </div>
        </AuthShell>
    );
}

export default VerifyEmail;
