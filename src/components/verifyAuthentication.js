import { useEffect } from "react";
import verifyAuthentication from "../services/verifyAuthentication";
import { useNavigate } from "react-router-dom";

function VerifyAuth(){
    const navigate = useNavigate();
    useEffect(() => {
        async function verifyAuth() {
            if(await verifyAuthentication() === "error"){
                navigate("/");
            }
        }
        verifyAuth();
    })
}

export default VerifyAuth;