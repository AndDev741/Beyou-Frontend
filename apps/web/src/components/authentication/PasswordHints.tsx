import { useTranslation } from "react-i18next";

type PasswordHintsProps = { password: string };

const MIN_LENGTH = 12;
const MIN_CLASSES = 2;

const countClasses = (value: string): number => {
    let classes = 0;
    if (/[a-z]/.test(value)) classes++;
    if (/[A-Z]/.test(value)) classes++;
    if (/[0-9]/.test(value)) classes++;
    if (/[^a-zA-Z0-9]/.test(value)) classes++;
    return classes;
};

export default function PasswordHints({ password }: PasswordHintsProps) {
    const { t } = useTranslation();
    // The zod schema trims before validating — mirror it so the hints never
    // show green for a password the schema would reject.
    const normalizedPassword = password.trim();
    const hints = [
        { key: "PasswordHintLength", ok: normalizedPassword.length >= MIN_LENGTH },
        { key: "PasswordHintClasses", ok: countClasses(normalizedPassword) >= MIN_CLASSES }
    ];

    return (
        <ul className="mt-1 w-[90vw] lg:w-[100%] max-w-[400px] text-left text-xs" data-testid="password-hints">
            {hints.map(hint => (
                <li
                    key={hint.key}
                    className={hint.ok ? "text-success" : "text-description"}
                    data-testid={`${hint.key}-${hint.ok ? "ok" : "pending"}`}
                >
                    {hint.ok ? "✓ " : "• "}{t(hint.key)}
                </li>
            ))}
        </ul>
    );
}
