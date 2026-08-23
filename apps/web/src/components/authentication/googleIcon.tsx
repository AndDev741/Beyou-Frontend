import { useTranslation } from "react-i18next";
import googleIcon from '../../assets/authentication/googleIcon.svg';

const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleIcon(){
    const { t } = useTranslation();
    if (!clientId) return null;

    const handleGoogleLogin = () => {
        const state = crypto.randomUUID();
        sessionStorage.setItem('oauth_state', state);

        const redirectUri = encodeURIComponent(appUrl + '/');
        const scope = encodeURIComponent(
            'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'
        );

        // prompt=select_account, or Google answers for the user: a browser carrying
        // exactly one Google session skips the chooser and signs that account straight
        // in, with no way back to the others short of signing out of Google itself.
        // Mobile had the same hole in a harsher form and is fixed alongside this.
        // Not prompt=consent, which would also re-ask for scopes already granted.
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${redirectUri}&response_type=code&client_id=${clientId}&scope=${scope}&access_type=offline&prompt=select_account&state=${state}`;
    };

    return(
        <div className="mt-5">
            {/* A divider before the alternative: the Google button is the second
                option, not a visual pair for "Sign in". */}
            <div className="mb-4 flex items-center gap-3 text-xs text-text-3">
                <span className="h-px flex-1 bg-border" />
                {t("Or")}
                <span className="h-px flex-1 bg-border" />
            </div>
            <button
                onClick={handleGoogleLogin}
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-control border border-border bg-surface text-sm font-semibold text-text transition-colors duration-200 hover:bg-surface-2"
            >
                <img className="h-5 w-5" src={googleIcon} alt="" aria-hidden="true" />
                {t("ContinueWithGoogle")}
            </button>
        </div>
    )
}

export default GoogleIcon;