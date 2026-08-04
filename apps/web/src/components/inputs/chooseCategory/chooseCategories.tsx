import { useEffect, useState } from "react";
import getCategories from "@beyou/api/categories/getCategories";
import { useTranslation } from "react-i18next";
import CategoryItem from "./categoryItem";
import category from "@beyou/types/category/categoryType";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import Modal from "../../modals/Modal";
import CategoryForm from "../../categories/CategoryForm";
import { Plus } from "lucide-react";

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
        <div className="w-full">
            <div className="flex flex-wrap gap-1.5">
                {categories.length > 0 ? (
                    categories.map((category) => (
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
                    ))
                ) : (
                    <span className="text-[12.5px] text-text-3">{t("YouDontHaveCategories")}</span>
                )}

                {/* O convite de nova categoria mora na própria fileira, como no
                    mockup — chip tracejado que abre a criação rápida. */}
                <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11.5px] font-semibold text-text-3 transition-colors duration-200 hover:border-accent hover:text-accent"
                    aria-label={t("AddCategory")}
                >
                    <Plus size={13} aria-hidden="true" />
                    {t("New category")}
                </button>
            </div>

            {errorMessage ? (
                <p className="mt-1.5 text-xs text-danger" title={errorMessage}>{errorMessage}</p>
            ) : null}

            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
                <CategoryForm
                    mode="create"
                    dispatchFunction={enterCategories}
                    onCreated={(values) => handleCategoryCreated({ name: values.name, iconId: values.iconId })}
                    onClose={() => setShowCreateModal(false)}
                />
            </Modal>
        </div>
    )
}

export default ChooseCategories;
