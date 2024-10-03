import axios from '../axiosConfig';

async function googleRequest(code){
    try{
        if(code != null){
            const response = await axios.get(`/auth/google?code=${code}`);
            return response.data;
        }
    }catch(e){
        if(e.response){
            return e.response.data;
        }else{
            console.error("Error trying to connect with backend", e)
        }
    }

}

export default googleRequest;