import axios from '../../axiosConfig';

async function logoutRequest(){
    try{
        const response = await axios.post("/auth/logout");
        if(response){
            return true;
        }
    }catch(e){
        console.error("error trying to logout user: " + e);
        return false;
    }
}

export default logoutRequest;