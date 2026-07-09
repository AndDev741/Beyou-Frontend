// Resolves a profile photo value to a URL an <Image> can load.
//
// The `photo` field from GET /user is one of:
//   - an absolute URL (Google CDN, e.g. https://lh3.googleusercontent.com/...)
//   - a relative API path we serve ourselves (e.g. /api/v1/user/photo/{id})
//   - empty/null (no photo)
//
// Absolute URLs pass through untouched. Relative paths get the backend origin
// prepended — derived from the SAME EXPO_PUBLIC_API_URL nativeHttpClient uses,
// minus its /api/v1 suffix (the photo path already carries /api/v1).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8099/api/v1';
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

export function resolvePhotoUrl(photo: string): string {
  if (!photo) return '';
  // Only root-relative API paths need the origin. Absolute URLs (Google CDN)
  // and local picker URIs (file://, content://) pass through untouched.
  if (photo.startsWith('/')) return `${API_ORIGIN}${photo}`;
  return photo;
}
