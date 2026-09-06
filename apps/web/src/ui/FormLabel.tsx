import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** The forms' label typography, for the few places that must stay a bare element. */
export const FORM_LABEL_CLASS = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

export type FormLabelProps = {
    children: ReactNode;
    /** Points a `<label>` at its control. Without it the label renders as a `<span>`. */
    htmlFor?: string;
    /** The server refuses the form without this field. Draws the accent asterisk. */
    required?: boolean;
    /** The field may stay empty. Writes "optional" after the label, muted. */
    optional?: boolean;
    /** `legend` for a fieldset of radios/checkboxes. */
    as?: "label" | "span" | "legend";
    className?: string;
};

/**
 * The label above a control with the field's standing spelled out: an accent asterisk
 * when the server will refuse the form without it, a muted "optional" when it may stay
 * empty. One marker per field, never both; a label with neither flag is bare (read-only
 * fields, group headings).
 *
 * The marker is CSS generated content read from `data-marker`, not a child node. A
 * child would join the label's text, so the control's accessible name would become
 * "Name *" and "Description · optional" — every `getByLabelText("Name")` in the suite,
 * and every screen reader, would hear the marker as part of the field's name. The
 * standing is conveyed to assistive tech by the form's own validation messages.
 *
 * Every form label goes through here so the convention lives in one file rather than in
 * the `labelClass` string each form used to keep. The mobile `FieldLabel` is the same
 * component in React Native.
 */
export default function FormLabel({
    children,
    htmlFor,
    required,
    optional,
    as,
    className = ""
}: FormLabelProps) {
    const { t } = useTranslation();
    const Tag = as ?? (htmlFor ? "label" : "span");
    const marker = required
        ? { text: "*", className: "after:ml-1 after:text-accent after:content-[attr(data-marker)]" }
        : optional
          ? {
                text: `· ${t("FieldOptional")}`,
                className:
                    "after:ml-1.5 after:font-mono after:text-[10.5px] after:font-normal after:text-text-3 after:content-[attr(data-marker)]"
            }
          : null;
    return (
        <Tag
            htmlFor={Tag === "label" ? htmlFor : undefined}
            data-marker={marker?.text}
            className={`${FORM_LABEL_CLASS} ${marker?.className ?? ""} ${className}`}
        >
            {children}
        </Tag>
    );
}
