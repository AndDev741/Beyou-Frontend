import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import verifyAuthentication from "../services/verifyAuthentication";

function useAuthGuard() {
    const navigate = useNavigate();

    useEffect(() => {
        const verifyAuth = async () => {
            const authenticated = await verifyAuthentication();
            if (authenticated === "error") {
                navigate("/");
            }
        };
        verifyAuth();
    }, [navigate]);
}

export default useAuthGuard;
