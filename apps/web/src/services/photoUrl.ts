// Resolves a profile photo value to a URL an <img> tag can load.
//
// The `photo` field from GET /user is one of:
//   - an absolute URL (Google CDN, e.g. https://lh3.googleusercontent.com/...)
//   - a relative API path we serve ourselves (e.g. /api/v1/user/photo/{id})
//   - empty/null (no photo)
//
// Relative paths get the backend origin prepended — derived from the SAME
// VITE_API_URL axios uses, minus its /api/v1 suffix (the photo path already
// carries /api/v1). No hardcoded prod host.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8099/api/v1';
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

// Only these schemes may reach an <img src>. Any other value the backend echoes
// back (javascript:, data:text/html, vbscript:, ...) is dropped so a stored photo
// string can never become a script/HTML-injection sink.
const SAFE_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

export function resolvePhotoUrl(photo: string): string {
    if (!photo) return '';
    // Root-relative API path we serve ourselves — prepend the backend origin.
    if (photo.startsWith('/')) return `${API_ORIGIN}${photo}`;

    // Parseia de verdade em vez de casar com regex: o parser normaliza a string
    // and returns a NEW `href`, so nothing of the original value reaches `src`
    // without passing through here. A malformed URL throws and is dropped — the old
    // regex let through anything that started with a known scheme.
    let url: URL;
    try {
        url = new URL(photo);
    } catch {
        return '';
    }

    // `data:` for images only — `data:text/html` is HTML injection by another name.
    if (url.protocol === 'data:') {
        return url.pathname.startsWith('image/') ? url.href : '';
    }
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : '';
}
