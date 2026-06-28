// Bridge from the web reset/verify pages to the native app via the `beyou://`
// custom scheme. Email links stay https (clickable everywhere, not stripped by
// mail clients); when such a link is opened on a phone, the page offers to hand
// the token off to the installed app, which finishes the flow natively.

export type AppLinkPath = 'reset' | 'verify';

/** Mobile-UA heuristic (Android-first; iOS included for completeness). */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** beyou://<path>?token=<token> — maps to the app's (auth)/<path> route. */
export function buildAppLink(path: AppLinkPath, token: string): string {
  return `beyou://${path}?token=${encodeURIComponent(token)}`;
}
