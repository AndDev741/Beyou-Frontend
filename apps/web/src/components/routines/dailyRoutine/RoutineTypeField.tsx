import { useTranslation } from "react-i18next";
import SegmentedControl from "../../../ui/SegmentedControl";

/**
 * The routine's type. Only "daily" exists today — the list one is designed but not
 * implemented, and shows disabled instead of hidden: whoever opens the form can see
 * a second format is on the way.
 *
 * Replaces the two-illustration fork that used to open the creation flow; the form
 * now starts straight on what 100% of users will pick.
 */
export default function RoutineTypeField() {
    const { t } = useTranslation();

    return (
        <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                {t("RoutineTypeLabel")}
            </span>
            <SegmentedControl
                className="w-full"
                label={t("RoutineTypeLabel")}
                value="daily"
                onChange={() => {}}
                options={[
                    { value: "daily", label: t("RoutineTypeDaily") },
                    { value: "list", label: t("RoutineTypeList"), disabled: true },
                ]}
            />
        </div>
    );
}
