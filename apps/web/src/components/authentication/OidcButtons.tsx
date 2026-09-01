import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchOidcProviders, OidcProvider } from "@beyou/api";
import { beginOidcLogin } from "../../services/authentication/oidcPkce";
import omelhorsiteIcon from '../../assets/authentication/omelhorsiteIcon.png';
import { toast } from "react-toastify";

/**
 * Provider marks, bundled rather than hot-linked.
 *
 * <p>A remote <img> would hand the provider the IP address of everyone who so much as
 * loads the login screen, whether or not they ever use it — and the privacy policy says
 * that provider sees your address only while you are on its own sign-in page. Bundling
 * keeps that sentence true, and the button still renders when their host is down.
 *
 * <p>A provider with no mark here still gets a button, without an icon.
 */
const PROVIDER_MARKS: Record<string, string> = {
    omelhorsite: omelhorsiteIcon,
};

const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
const issuer = import.meta.env.VITE_OIDC_ISSUER;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;

/**
 * The federated sign-in buttons, below Google.
 *
 * <p>Renders nothing at all when the deployment has not configured a provider, and that
 * is the normal state: the feature ships dark, and the button appears only once both the
 * client env vars and the server's provider block are set. Absent beats present-and-broken
 * on a login screen.
 *
 * <p>The server is asked which providers exist rather than the list being hard-coded here,
 * so turning one off is a config change on one side, not a release on both.
 */
function OidcButtons() {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<OidcProvider[]>([]);

    useEffect(() => {
        if (!issuer || !clientId) return;
        let alive = true;
        fetchOidcProviders().then((list) => { if (alive) setProviders(list); });
        return () => { alive = false; };
    }, []);

    if (!issuer || !clientId || providers.length === 0) return null;

    const start = async (slug: string) => {
        try {
            await beginOidcLogin({ slug, issuer, clientId, redirectUri: appUrl + '/' });
        } catch (e) {
            console.error(e);
            toast.error(t('OidcLoginError'));
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-2">
            {providers.map((provider) => (
                <button
                    key={provider.slug}
                    onClick={() => start(provider.slug)}
                    type="button"
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-control border border-border bg-surface text-sm font-semibold text-text transition-colors duration-200 hover:bg-surface-2"
                >
                    {PROVIDER_MARKS[provider.slug] && (
                        <img
                            className="h-5 w-5 object-contain"
                            src={PROVIDER_MARKS[provider.slug]}
                            alt=""
                            aria-hidden="true"
                        />
                    )}
                    {t('ContinueWithProvider', { provider: provider.displayName })}
                </button>
            ))}
        </div>
    );
}

export default OidcButtons;
