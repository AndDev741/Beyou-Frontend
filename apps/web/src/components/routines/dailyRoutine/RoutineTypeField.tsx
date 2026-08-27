import { useTranslation } from "react-i18next";
import SegmentedControl from "../../../ui/SegmentedControl";

type RoutineTypeFieldProps = {
    value: string;
    onChange: (value: string) => void;
    /**
     * Editing rather than creating. The backend refuses a type change — switching would
     * either discard every time window the user set or invent times nobody chose — so the
     * control shows what the routine is and does not pretend to offer the other option.
     */
    disabled?: boolean;
};

/**
 * The routine's shape, picked before anything else in the form.
 *
 * "Daily" is sections with time windows. "List" is a plain checklist the user ticks off
 * whenever they like. Both are scheduled the same way afterwards; the choice here only
 * decides which form the rest of the dialog shows.
 */
export default function RoutineTypeField({ value, onChange, disabled = false }: RoutineTypeFieldProps) {
    const { t } = useTranslation();

    return (
        <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                {t("RoutineTypeLabel")}
            </span>
            <SegmentedControl
                className="w-full"
                label={t("RoutineTypeLabel")}
                value={value}
                onChange={onChange}
                options={[
                    {
                        value: "daily",
                        label: t("RoutineTypeDaily"),
                        description: t("RoutineTypeDailyDescription"),
                        disabled,
                    },
                    {
                        value: "list",
                        label: t("RoutineTypeList"),
                        description: t("RoutineTypeListDescription"),
                        disabled,
                    },
                ]}
            />
        </div>
    );
}
