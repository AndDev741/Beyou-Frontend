import { useEffect, useState } from "react";
import getCategories from "../../../services/categories/getCategories";
import { useTranslation } from "react-i18next";
import CategoryItem from "./categoryItem";
import category from "../../../types/category/categoryType";
import { enterCategories } from "../../../redux/category/categoriesSlice";
import Modal from "../../modals/Modal";
import CategoryForm from "../../categories/CategoryForm";
import { CgAddR } from "react-icons/cg";

type chooseCategoriesProps = {
    categoriesIdList: string[],
    setCategoriesIdList: React.Dispatch<React.SetStateAction<string[]>>,
    errorMessage: string,
    chosenCategories?: category[] | null,
    chosenCategoriesId?: string[]
}

function ChooseCategories({categoriesIdList, setCategoriesIdList, errorMessage, chosenCategories, chosenCategoriesId}: chooseCategoriesProps){
    const {t} = useTranslation();
    const [categories, setCategories] = useState<category[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pendingSelection, setPendingSelection] = useState<{ name: string; iconId: string } | null>(null);
    const errorCss = "text-error text-sm leading-snug break-words whitespace-normal max-w-full mt-1 text-center";

    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(t);
            if(response.success && Array.isArray(response.success)){
                setCategories(response.success);
            }else{
                console.error(response);
            }
        };

        returnCategories();
    }, [t, refreshKey])

    useEffect(() => {
        if (!pendingSelection || categories.length === 0) return;

        const match =
            categories.find((category) =>
                category.name === pendingSelection.name && category.iconId === pendingSelection.iconId
            ) || categories.find((category) => category.name === pendingSelection.name);

        if (match) {
            const next = categoriesIdList.includes(match.id)
                ? categoriesIdList
                : [...categoriesIdList, match.id];
            setCategoriesIdList(next);
        }
        setPendingSelection(null);
    }, [categories, categoriesIdList, pendingSelection, setCategoriesIdList]);

    const handleCategoryCreated = (values: { name: string; iconId: string }) => {
        setPendingSelection(values);
        setRefreshKey((prev) => prev + 1);
        setShowCreateModal(false);
    };

    return(
        <>
            <div className="relative flex flex-col items-center justify-center w-full mt-2 md:flex-row">
                <h3 className="text-2xl text-center text-secondary">{t("Categories")}</h3>
                <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-1 flex items-center gap-1 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/10 transition-colors duration-200 md:mt-0 md:absolute md:right-1"
                    aria-label={t("AddCategory")}
                >
                    <CgAddR className="text-lg" />
                    <span className="hidden sm:inline">{t("AddCategory")}</span>
                </button>
            </div>
            {errorMessage ? <p className={errorCss} title={errorMessage}>{errorMessage}</p> : null}
            <div className="flex flex-wrap flex-col items-center w-[95vw] max-h-[200px] md:w-[100%] overflow-x-auto mt-2 text-secondary">
                <div className="flex flex-wrap items-center justify-evenly px-1 mb-2">
                    {categories.length > 0 ? categories.map((category) => (
                        
                        <div key={category.id} 
                        className="flex flex-col items-center line-clamp-1 px-2">
                            <CategoryItem
                            key={category.id}
                            categoriesIdList={categoriesIdList}
                            setCategoriesIdList={setCategoriesIdList}
                            categoryId={category.id}
                            name={category.name}
                            iconId={category.iconId}
                            chosenCategories={chosenCategories}
                            chosenCategoriesId={chosenCategoriesId}
                            />
                        </div>
                    
                    )): (

                    <h1 className="text-primary">{t("YouDontHaveCategories")}</h1>
                    )}
                </div>
            </div>
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
                <CategoryForm
                    mode="create"
                    dispatchFunction={enterCategories}
                    onCreated={(values) => handleCategoryCreated({ name: values.name, iconId: values.iconId })}
                    onClose={() => setShowCreateModal(false)}
                />
            </Modal>
        </>
        
    )
}

export default ChooseCategories;
