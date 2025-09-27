import { EditUser } from "../../types/user/EditUser";
import axios from '../axiosConfig';


export default async function editUser(EditUser: EditUser): Promise<Record<string, string>> {
    
    try{
        const response = axios.put("/user/edit", EditUser);

        return (await response).data;
    }catch(e){
        console.error(e);
        return {error: "Unexpected error"};
    }
    
}