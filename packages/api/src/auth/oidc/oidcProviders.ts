import { getHttpClient } from '../../httpClient';
import { getLogger } from '../../logger';
import { OidcProvider } from './types';

/**
 * The federated providers this deployment offers.
 *
 * <p>Returns an empty list on any failure, and that is deliberate: the login screen still
 * has to render. A provider list that cannot be fetched means no extra buttons, never a
 * broken sign-in page — the password and Google doors are unaffected by this call.
 */
export default async function fetchOidcProviders(): Promise<OidcProvider[]> {
    try {
        const response = await getHttpClient().get<{ providers: OidcProvider[] }>('/auth/oidc/providers');
        return response.data.providers ?? [];
    } catch (e) {
        getLogger().error(e);
        return [];
    }
}
