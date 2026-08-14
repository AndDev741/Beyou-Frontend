import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import Button from "../Button";
import Modal from "../modals/Modal";

type GoalProgressModalProps = {
    isOpen: boolean;
    onClose: () => void;
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    /** Runs the request; the modal closes once it settles. */
    onApply: (amount: number, direction: "increase" | "decrease") => Promise<void>;
};

/** The jumps worth one tap. Anything else goes in the field. */
const QUICK_AMOUNTS = [1, 5, 10];

/**
 * Progress by an amount the user chooses. The card's +/- stay as the one-at-a-time
 * path; this is for the day someone read forty pages and does not want to press
 * plus forty times.
 */
function GoalProgressModal({
    isOpen,
    onClose,
    name,
    currentValue,
    targetValue,
    unit,
    onApply,
}: GoalProgressModalProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const amountId = useId();
    const [amount, setAmount] = useState("1");
    const [pending, setPending] = useState(false);

    // Every opening starts from 1, so a big jump typed once does not come back as
    // the default on the next goal.
    useEffect(() => {
        if (isOpen) {
            setAmount("1");
            setPending(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const parsed = Number(amount);
    const isValid = Number.isFinite(parsed) && parsed > 0;

    const apply = async (direction: "increase" | "decrease") => {
        if (!isValid || pending) return;
        setPending(true);
        try {
            await onApply(parsed, direction);
            onClose();
        } finally {
            setPending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="max-w-md">
            <form
                className="text-text"
                onSubmit={(event) => {
                    event.preventDefault();
                    void apply("increase");
                }}
            >
                <h1 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {t("UpdateProgress")}
                </h1>
                <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">{name}</p>
                <p className="mt-0.5 font-mono text-[12.5px] text-text-3">
                    {currentValue}/{targetValue} {unit}
                </p>

                <label htmlFor={amountId} className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-text-2">
                    {t("Amount")}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        id={amountId}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-24 shrink-0 rounded-control border border-border bg-surface px-3 py-2.5 font-mono text-[13.5px] text-text transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    {QUICK_AMOUNTS.map((quick) => (
                        <button
                            key={quick}
                            type="button"
                            onClick={() => setAmount(String(quick))}
                            aria-pressed={parsed === quick}
                            className={`rounded-control border px-3 py-1.5 font-mono text-xs font-semibold transition-colors duration-200 ${
                                parsed === quick
                                    ? "border-accent bg-accent-soft text-accent"
                                    : "border-border text-text-3 hover:text-text-2"
                            }`}
                        >
                            +{quick}
                        </button>
                    ))}
                </div>

                <div className="mt-[18px] flex flex-wrap justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                    <Button
                        text={t("Remove")}
                        mode="ghost"
                        size="medium"
                        type="button"
                        icon={<Minus size={16} aria-hidden="true" />}
                        disabled={!isValid || pending || currentValue === 0}
                        onClick={() => void apply("decrease")}
                    />
                    <Button
                        text={t("Add")}
                        mode="primary"
                        size="medium"
                        type="submit"
                        icon={<Plus size={16} aria-hidden="true" />}
                        disabled={!isValid || pending}
                    />
                </div>
            </form>
        </Modal>
    );
}

export default GoalProgressModal;
