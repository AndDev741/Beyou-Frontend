import axios from '../axiosConfig';

async function deleteCategory(categoryId){
    try{
        const response = await axios.delete(`/category/${categoryId}`);
        return response.data;
    }catch(e){
        console.error(e);
        return e.response.data
    }
}

export default deleteCategory;