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
    } catch (e) {
        console.error(e);
        return { error: " " };
    }
};

export default registerRequest;
