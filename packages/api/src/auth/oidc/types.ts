/**
 * Federated sign-in, shared between web and mobile.
 *
 * <p>Only the network half lives here. The PKCE dance itself is platform work — the web
 * builds the redirect by hand with `crypto.subtle`, mobile hands it to expo-auth-session —
 * and pretending otherwise would mean one abstraction that fits neither.
 *
 * <p>What IS shared is the part that must not drift: the endpoint shapes, and the reading
 * of a 403 as "link required" rather than as a failure to retry.
 */

export type OidcProvider = {
    slug: string;
    displayName: string;
};

/**
 * Why an identity that verified may still not enter on its own.
 *
 * Mirrors `FederationOutcome.LinkRequired.Reason` in the backend. Both values lead to the
 * same screen; they differ only in what the screen says.
 */
export type OidcLinkRequiredReason = 'EMAIL_NOT_TRUSTED' | 'ACCOUNT_EXISTS';

export type OidcLinkRequired = {
    kind: 'linkRequired';
    reason: OidcLinkRequiredReason;
    provider: string;
};
