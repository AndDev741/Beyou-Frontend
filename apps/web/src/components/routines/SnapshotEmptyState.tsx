import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import EmptyState from "../EmptyState";

export const SnapshotEmptyState = () => {
    const { t } = useTranslation();
    return (
        <EmptyState
            icon={<History size={20} aria-hidden="true" />}
            title={t("No history available for this date")}
            description={t("Snapshots are created when you interact with your routines. Try selecting a date when you had scheduled routines.")}
        />
    );
};
