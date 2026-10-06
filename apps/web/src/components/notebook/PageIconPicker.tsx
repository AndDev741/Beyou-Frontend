import { useState } from "react";
import type { SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../modals/Modal";
import IconsBoxSmall from "../inputs/iconsBoxSmall";

/**
 * Choosing a topic's or page's icon: the app's icon picker, the same one categories and habits
 * use, in a dialog. Picking an icon saves it at once; "Use the default" clears it.
 */
export default function PageIconPicker({ isOpen, current, onPick, onClose }: {
    isOpen: boolean;
    current: string | null;
    onPick: (icon: string | null) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");

    const pick = (value: SetStateAction<string>) => {
        const icon = typeof value === "function" ? value(current ?? "") : value;
        if (icon) onPick(icon);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy="page-icon-title">
            <div className="flex w-full flex-col gap-3" data-testid="page-icon-picker">
                <h2 id="page-icon-title" className="text-lg font-semibold text-text">{t("NotebookIconTitle")}</h2>
                <IconsBoxSmall
                    search={search}
                    setSearch={setSearch}
                    iconError=""
                    t={t}
                    selectedIcon={current ?? ""}
                    setSelectedIcon={pick}
                    minLgH={220}
                />
                <div className="flex justify-end gap-2">
                    {current && (
                        <button type="button" onClick={() => onPick(null)} data-testid="page-icon-clear"
                            className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">
                            {t("NotebookIconDefault")}
                        </button>
                    )}
                    <button type="button" onClick={onClose}
                        className="rounded-control border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                        {t("Close")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
