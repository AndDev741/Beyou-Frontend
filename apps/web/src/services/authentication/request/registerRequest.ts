import axios from "axios";
import { detectTimezone } from "../../user/reconcileTimezone";

const registerRequest = async (name: string, email: string, password: string): Promise<Record<string, string>> => {
    // The account is created with this zone, so a new user is never born on the UTC
    // calendar. Optional on the wire: an undefined value is simply omitted, and the
    // backend drops anything it cannot parse rather than refusing the registration.
    const registerData = {
        name: name,
        email: email,
        password: password,
        timezone: detectTimezone() ?? undefined
    };

    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8099';
        const response = await axios.post(`${apiUrl}/auth/register`, registerData);
        return response.data;
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'response' in e) {
            const axiosError = e as { response?: { status?: number; data?: Record<string, string> } };
            const errorKey = axiosError.response?.data?.errorKey || axiosError.response?.data?.error;
            if (errorKey) {
                return { error: errorKey };
            }
        }
        return { error: "UNKNOWN" };
    }
};

export default registerRequest;
