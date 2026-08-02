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

        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${redirectUri}&response_type=code&client_id=${clientId}&scope=${scope}&access_type=offline&state=${state}`;
    };

    return(
        <div className="mt-5">
            {/* Separador antes da alternativa: o botão do Google é a segunda
                opção, não um par visual do "Entrar". */}
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