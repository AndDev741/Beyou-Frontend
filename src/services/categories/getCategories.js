import axios from '../axiosConfig';

async function getCategories(userId){
    try{
        const response = await axios.get(`/category/${userId}`);
        return {success: response.data};
    }catch(e){
        console.error(e);
        return {error: e.response.data}
    }
}

export default getCategories