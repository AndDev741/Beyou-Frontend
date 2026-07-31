import instance from "../../services/axiosConfig";

/**
 * Fetches an attachment's bytes and hands back an object URL an `<img>` can use.
 *
 * Why not just `<img src={apiBase + attachment.url}>`: the endpoint answers with
 * raw JPEG bytes and is owner-or-admin gated on the bearer token, which lives in
 * memory on the axios instance. A browser-issued image request carries no
 * Authorization header, so it would simply be refused.
 *
 * Why not the shared `HttpClient` from `@beyou/api`: its `RequestConfig` is
 * deliberately narrow (headers/params/timeout) and has no `responseType`, so it
 * cannot ask for a binary body. Widening that interface for every platform to
 * serve one web-only admin screen buys nothing — this stays here, in the web
 * app, and still goes through the app's axios instance so the request inherits
 * the Authorization header, `withCredentials`, and the 401-refresh interceptor.
 *
 * The caller owns the returned URL and must `URL.revokeObjectURL` it.
 */
export const fetchAttachmentObjectUrl = async (url: string): Promise<string> => {
    const response = await instance.get<Blob>(url, { responseType: "blob" });
    return URL.createObjectURL(response.data);
};
