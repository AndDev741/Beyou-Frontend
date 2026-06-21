/**
 * RFC4122 version-4 UUID, dependency-free. Used for client-side ids of NEW
 * routine sections/items (the backend accepts client-supplied UUIDs on edit,
 * mirroring the web `uuid` usage). Math.random is fine for these low-volume ids.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
