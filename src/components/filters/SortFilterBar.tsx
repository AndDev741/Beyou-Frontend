import { useId } from "react";
import { FiFilter } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export type SortOption = {
  value: string;
  label: string;
};

type SortFilterBarProps = {
  title: string;
  description?: string;
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  quickValues?: string[];
  className?: string;
};

const SortFilterBar = ({
  title,
  description,
  options,
  value,
  onChange,
  quickValues,
  className = ""
}: SortFilterBarProps) => {
  const { t } = useTranslation();
  const selectId = useId();
  const quickOptions = quickValues
    ? options.filter((option) => quickValues.includes(option.value))
    : [];

  return (
    <section
      className={`w-full rounded-xl border border-primary/20 bg-background/80 p-3 shadow-sm backdrop-blur ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FiFilter className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-description">
              {description || t("Sort results")}
            </span>
            <h2 className="text-lg font-semibold text-secondary">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor={selectId} className="text-sm font-medium text-description">
            {t("Sort by")}
          </label>
          <select
            id={selectId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full max-w-[160px] md:max-w-[230px] rounded-lg border border-primary/30 bg-background px-3 py-2 text-sm text-secondary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {quickOptions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickOptions.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-background"
                    : "border-primary/30 bg-primary/10 text-primary hover:border-primary/60"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SortFilterBar;
