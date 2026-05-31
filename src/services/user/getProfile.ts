import { UserType } from "../../types/user/UserType";
import axiosWithCredentials from "../axiosConfig";
import axios from "axios";

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
        const response = await axiosWithCredentials.get<UserType>("/user");
        return { data: response.data };
    } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error(e);
        }
        return { error: "Failed to load profile" };
    }
}
