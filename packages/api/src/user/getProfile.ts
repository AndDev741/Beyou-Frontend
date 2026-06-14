import { UserType } from "@beyou/types/user/UserType";
import { getHttpClient, ApiError } from "../httpClient";
import { getLogger } from "../logger";

type GetProfileResponse = {
    data?: UserType;
    error?: string;
};

/**
 * Fetch the authenticated user's profile (GET /user → UserResponseDTO).
 *
 * Used on app boot to re-hydrate the non-persisted `perfil` slice after the
 * silent refresh restores the in-memory JWT. Requires the axios Authorization
 * header to already be set.
 */
export default async function getProfile(): Promise<GetProfileResponse> {
    try {
        const response = await getHttpClient().get<UserType>("/user");
        return { data: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
        }
        return { error: "Failed to load profile" };
    }
}
