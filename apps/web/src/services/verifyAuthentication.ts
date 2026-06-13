import axios from './axiosConfig';

async function verifyAuthentication(){
    try{
        const response = await axios.get("/auth/verify");
        if(response){
            return "authenticated";
        }
    }catch(e){
        console.error("error trying authenticate user: " + e);
        return "error";
    }
}

export default verifyAuthentication;