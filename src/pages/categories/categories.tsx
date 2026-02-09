import CreateCategory from "../../components/categories/createCategory";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useDispatch, useSelector } from "react-redux";
import Header from "../../components/header";
import { useEffect, useMemo } from "react";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { editModeEnter } from "../../redux/category/editCategorySlice";
import getCategories from "../../services/categories/getCategories";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
import { useTranslation } from "react-i18next";
import { enterCategories } from "../../redux/category/categoriesSlice";
import SortFilterBar, { SortOption } from "../../components/filters/SortFilterBar";
import {
  compareNumbers,
  compareStrings,
  getTimestamp,
  sortItems
} from "../../components/utils/sortHelpers";
import { setViewSort } from "../../redux/viewFilters/viewFiltersSlice";
// import categoryGeneratedByAi from "../../types/category/categoryGeneratedByAiType";

function Categories(){
    useAuthGuard();
    
    const dispatch = useDispatch();
    const {t} = useTranslation();

    const editMode = useSelector((state: RootState) => state.editCategory.editMode);
    // const [generatedCategory, setGeneratedCategory] = useState<categoryGeneratedByAi>({categoryName: "", description: ""});
    const categories = useSelector((state: RootState) => state.categories.categories) || [];
    const sortBy = useSelector((state: RootState) => state.viewFilters.categories);

    const sortOptions: SortOption[] = [
        { value: "default", label: t("Default order") },
        { value: "name-asc", label: t("Name (A-Z)") },
        { value: "name-desc", label: t("Name (Z-A)") },
        { value: "level-desc", label: t("Level (High to Low)") },
        { value: "level-asc", label: t("Level (Low to High)") },
        { value: "xp-desc", label: t("XP (High to Low)") },
        { value: "xp-asc", label: t("XP (Low to High)") },
        { value: "created-desc", label: t("Newest first") },
        { value: "created-asc", label: t("Oldest first") }
    ];

    const sortedCategories = useMemo(() => {
        switch (sortBy) {
            case "name-asc":
                return sortItems(categories, (a, b) => compareStrings(a.name, b.name));
            case "name-desc":
                return sortItems(categories, (a, b) => compareStrings(b.name, a.name));
            case "level-desc":
                return sortItems(categories, (a, b) => compareNumbers(b.level, a.level));
            case "level-asc":
                return sortItems(categories, (a, b) => compareNumbers(a.level, b.level));
            case "xp-desc":
                return sortItems(categories, (a, b) => compareNumbers(b.xp, a.xp));
            case "xp-asc":
                return sortItems(categories, (a, b) => compareNumbers(a.xp, b.xp));
            case "created-desc":
                return sortItems(categories, (a, b) =>
                    compareNumbers(getTimestamp(b.createdAt), getTimestamp(a.createdAt))
                );
            case "created-asc":
                return sortItems(categories, (a, b) =>
                    compareNumbers(getTimestamp(a.createdAt), getTimestamp(b.createdAt))
                );
            default:
                return categories;
        }
    }, [categories, sortBy]);

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "categories", sortBy: value }));
    };

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);
    
    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(t);
            if(Array.isArray(response.success)){
                dispatch(enterCategories(response.success));
            }else if(response.error = t('Get categories return a error')){
                dispatch(defaultErrorEnter(response.error));
            }
        }
        returnCategories();
    }, [t]);
    
    return(
        <div className="bg-background min-h-screen text-secondary">
            <Header pageName={"YourCategories"}/>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start pb-4 lg:mb-0 mt-4 px-3 lg:px-6">
                <div className="w-[100%]">
                    <SortFilterBar
                        title={t("Categories view")}
                        description={t("Sort results")}
                        options={sortOptions}
                        value={sortBy}
                        onChange={handleSortChange}
                        quickValues={["name-asc", "xp-desc", "level-desc"]}
                        className="mb-4"
                    />
                    <RenderCategories categories={sortedCategories} />
                </div>
                <div className="lg:flex lg:flex-col w-[100%]">
                    {editMode ? <EditCategory dispatchFunction={enterCategories}/> : 
                    <CreateCategory dispatchFunction={enterCategories} />}
                </div>
            </main>
        </div>
    )
}

export default Categories;
