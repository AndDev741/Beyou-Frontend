import axios from '../axiosConfig';

async function getHabits(userId){
    try{
        const response = await axios.get(`/habit/${userId}`);
        return response.data;
    }catch(e){
        console.error(e);
    }
}

export default getHabits;