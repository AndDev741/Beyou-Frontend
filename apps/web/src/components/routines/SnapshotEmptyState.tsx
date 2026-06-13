import { useTranslation } from "react-i18next";

export const SnapshotEmptyState = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-background p-16 text-center shadow-sm">
            <p className="text-5xl mb-4" role="img" aria-label={t("Calendar")}>
                {String.fromCodePoint(0x1F4C5)}
            </p>
            <p className="text-lg font-semibold text-secondary">
                {t("No history available for this date")}
            </p>
            <p className="mt-2 text-sm text-description max-w-md">
                {t("Snapshots are created when you interact with your routines. Try selecting a date when you had scheduled routines.")}
            </p>
        </div>
    );
};
