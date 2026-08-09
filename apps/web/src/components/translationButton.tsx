import { useTranslation } from "react-i18next";
import useChangeLanguage from "../hooks/useChangeLanguage";
import { useState } from "react";
import SegmentedControl from "../ui/SegmentedControl";

/**
 * The language in the same segmented control as the rest of the app — it used to be
 * two 24px square blocks that looked like family to nothing.
 */
function TranslationButton({updateUser}: {updateUser?: boolean}){
    const {t, i18n} = useTranslation();
    const [lng, setLng] = useState(i18n.language);

    useChangeLanguage(lng, updateUser);

    const current = i18n.language === "en" ? "en" : "pt";

    return(
        <SegmentedControl
            className="w-full"
            label={t("Language")}
            value={current}
            onChange={setLng}
            options={[
                { value: "pt", label: "Português" },
                { value: "en", label: "English" },
            ]}
        />
    )
}

export default TranslationButton;
