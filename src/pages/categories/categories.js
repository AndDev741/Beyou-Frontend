import CreateCategory from "../../components/categories/createCategory";
import VerifyAuth from "../../components/verifyAuthentication";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useSelector } from "react-redux";
import Header from "../../components/header";

function Categories(){
    const editMode = useSelector(state => state.editCategory.editMode);
    return(
        <>
        <VerifyAuth />
            <Header pageName={"YourCategories"}/>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start mb-4 lg:mb-0 mt-4">
                <div className="w-[100%] lg:w-[58%]">
                    <RenderCategories />
                </div>
                <div className="lg:flex lg:justify- w-[100%] lg:w-[42%]">
                    {editMode ? <EditCategory /> : <CreateCategory />}
                </div>
            </main>
        </>
    )
}

export default Categories;