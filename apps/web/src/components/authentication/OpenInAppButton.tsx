import { useTranslation } from "react-i18next";
import { AppLinkPath, buildAppLink, isMobileDevice } from "../utils/openInApp";

type OpenInAppButtonProps = {
    path: AppLinkPath;
    token: string;
};

/**
 * "Open in the BeYou app" deep-link button. Renders only on a mobile device and
 * only when a token is present — on desktop (or without a token) it renders
 * nothing, so the page falls back to the normal web flow.
 */
function OpenInAppButton({ path, token }: OpenInAppButtonProps) {
    const { t } = useTranslation();

    if (!token || !isMobileDevice()) return null;

    return (
        <a
            href={buildAppLink(path, token)}
            data-testid="open-in-app"
            className="flex items-center justify-center gap-2 px-8 py-3 my-4 bg-primary text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
        >
            {t("OpenInBeyouApp")}
        </a>
    );
}

export default OpenInAppButton;
