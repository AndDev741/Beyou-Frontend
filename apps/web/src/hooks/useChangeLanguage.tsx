import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import editUser from "@beyou/api/user/editUser";
import { useDispatch } from "react-redux";
import { languageInUserEnter } from "@beyou/state/user/perfilSlice";
import { logger } from "../utils/logger";

/**
 * Apply a language preference to i18next.
 *
 * Resolution priority (login-language UX): the user DTO's saved language wins
 * when present; otherwise we keep whatever the user picked on the login screen,
 * which the i18next LanguageDetector has already cached to localStorage.
 *
 * A brand-new account has `languageInUse === ""`. Calling
 * `i18n.changeLanguage("")` would reset i18next to `fallbackLng` ('en') and
 * clobber the language the user just selected on the login screen — so an
 * empty/falsy `lng` is a deliberate no-op here.
 *
 * @param lng       language code to apply ('en' | 'pt'); empty/falsy = no-op
 * @param updateUser when true, also persist the choice to the backend + redux
 */
export default function useChangeLanguage(lng: string, updateUser?: boolean) {
    const { i18n } = useTranslation();
    const dispatch = useDispatch();

    useEffect(() => {
        // No saved preference (e.g. fresh account): keep the login-screen choice.
        if (!lng) return;

        logger.log("Changing language to => ", lng);

        if (updateUser) {
            const updateUserLanguage = async () => {
                await editUser({ language: lng });
                dispatch(languageInUserEnter(lng));
            };
            updateUserLanguage();
        }

        i18n.changeLanguage(lng);
    }, [lng]);
}
