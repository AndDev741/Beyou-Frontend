import axios from "axios";

const registerRequest = async (name: string, email: string, password: string): Promise<Record<string, string>> => {
    const registerData = {
        name: name,
        email: email,
        password: password
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
