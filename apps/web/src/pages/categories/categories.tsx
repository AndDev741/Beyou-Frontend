import CreateCategory from "../../components/categories/createCategory";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "@beyou/state/rootReducer";
import {
    editModeEnter,
    idEnter,
    nameEnter,
    descriptionEnter,
    iconEnter
} from "@beyou/state/category/editCategorySlice";
import getCategories from "@beyou/api/categories/getCategories";
import { defaultErrorEnter } from "@beyou/state/errorHandler/errorHandlerSlice";
import { useTranslation } from "react-i18next";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import {
    compareNumbers,
    compareStrings,
    getTimestamp,
    sortItems
} from "../../components/utils/sortHelpers";
import { setViewSort } from "@beyou/state/viewFilters/viewFiltersSlice";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useCategoriesTutorial } from "../../components/tutorial/hooks/useCategoriesTutorial";
import PageHeader from "../../ui/PageHeader";
import Modal from "../../components/modals/Modal";
import Button from "../../components/Button";
import IconButton from "../../ui/IconButton";
import { Plus, Search, X } from "lucide-react";
// import categoryGeneratedByAi from "@beyou/types/category/categoryGeneratedByAiType";

type SortOption = { value: string; label: string };

function Categories(){
    useAuthGuard();

    const dispatch = useDispatch();
    const {t} = useTranslation();

    const editMode = useSelector((state: RootState) => state.editCategory.editMode);
    // const [generatedCategory, setGeneratedCategory] = useState<categoryGeneratedByAi>({categoryName: "", description: ""});
    const categories = useSelector((state: RootState) => state.categories.categories) || [];
    const sortBy = useSelector((state: RootState) => state.viewFilters.categories);
    const hasCategories = categories.length > 0;

    // Criar e editar saíram da coluna ao lado da lista: a grade fica com a
    // largura toda e o formulário abre em modal.
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const isFormOpen = isCreateOpen || editMode;

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

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((category) =>
            (category.name ?? "").toLowerCase().includes(term) ||
            (category.description ?? "").toLowerCase().includes(term)
        );
    }, [categories, search]);

    const sortedCategories = useMemo(() => {
        switch (sortBy) {
            case "name-asc":
                return sortItems(filteredCategories, (a, b) => compareStrings(a.name, b.name));
            case "name-desc":
                return sortItems(filteredCategories, (a, b) => compareStrings(b.name, a.name));
            case "level-desc":
                return sortItems(filteredCategories, (a, b) => compareNumbers(b.level, a.level));
            case "level-asc":
                return sortItems(filteredCategories, (a, b) => compareNumbers(a.level, b.level));
            case "xp-desc":
                return sortItems(filteredCategories, (a, b) => compareNumbers(b.xp, a.xp));
            case "xp-asc":
                return sortItems(filteredCategories, (a, b) => compareNumbers(a.xp, b.xp));
            case "created-desc":
                return sortItems(filteredCategories, (a, b) =>
                    compareNumbers(getTimestamp(b.createdAt), getTimestamp(a.createdAt))
                );
            case "created-asc":
                return sortItems(filteredCategories, (a, b) =>
                    compareNumbers(getTimestamp(a.createdAt), getTimestamp(b.createdAt))
                );
            default:
                return filteredCategories;
        }
    }, [filteredCategories, sortBy]);

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "categories", sortBy: value }));
    };

    // Sem chave nova de i18n: "filtrar" + "Categorias" já existem nos dois idiomas.
    const searchLabel = `${t("Filter")} ${t("Categories")}`;

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);

    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(t);
            if(Array.isArray(response.success)){
                dispatch(enterCategories(response.success));
            } else if (response.error) {
                dispatch(defaultErrorEnter(response.error));
            }
        }
        returnCategories();
    }, [t]);

    const {
        categorySteps,
        categoryStep,
        setCategoryStep,
        showCategorySpotlight,
        onComplete,
        onSkip
    } = useCategoriesTutorial({ hasCategories });

    // O formulário virou modal, então a âncora do passo "criar categoria" passa
    // a ser o botão que o abre — enquanto o modal está aberto o spotlight sai de
    // cena (o modal fica acima dele) e volta quando fecha, já no passo da lista.
    const closeForm = () => {
        setIsCreateOpen(false);
        dispatch(editModeEnter(false));
        dispatch(idEnter(null));
        dispatch(nameEnter(""));
        dispatch(descriptionEnter(""));
        dispatch(iconEnter(""));
    };

    return(
        <div className="min-h-screen w-full bg-bg px-4 py-6 text-text lg:px-7">
            {showCategorySpotlight && !isFormOpen && (
                <SpotlightTutorial
                    steps={categorySteps}
                    isActive={showCategorySpotlight}
                    currentStep={categoryStep}
                    onStepChange={setCategoryStep}
                    onComplete={onComplete}
                    onSkip={onSkip}
                />
            )}
            <PageHeader
                title={t("YourCategories")}
                subtitle={`${categories.length} ${t("Categories")}`}
                action={
                    <Button
                        text={t("CreateCategory")}
                        mode="primary"
                        size="medium"
                        icon={<Plus size={16} aria-hidden="true" />}
                        onClick={() => setIsCreateOpen(true)}
                        testId="create-category"
                        tutorialId={isFormOpen ? undefined : "category-create-form"}
                    />
                }
            />
            <main className="mt-4 flex flex-col gap-4 pb-4">
                {/* Barra compacta no lugar do cartão de ordenação: busca à
                    esquerda, ordenação à direita. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label={searchLabel}
                            placeholder={searchLabel}
                            className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                    <select
                        aria-label={t("Sort by")}
                        value={sortBy}
                        onChange={(event) => handleSortChange(event.target.value)}
                        className="h-10 rounded-control border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:w-[220px]"
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <RenderCategories
                    categories={sortedCategories}
                    emptyTitle={search.trim() && hasCategories ? t("NoCategories") : undefined}
                />
            </main>

            {isFormOpen && (
                <Modal
                    isOpen
                    onClose={closeForm}
                    labelledBy={editMode ? "category-edit-title" : "category-create-title"}
                    className="max-w-3xl"
                >
                    <IconButton
                        label={t("Close")}
                        onClick={closeForm}
                        className="absolute right-3 top-3"
                    >
                        <X size={18} aria-hidden="true" />
                    </IconButton>
                    {editMode ? (
                        <EditCategory dispatchFunction={enterCategories} onClose={closeForm} />
                    ) : (
                        <CreateCategory
                            dispatchFunction={enterCategories}
                            onClose={() => setIsCreateOpen(false)}
                        />
                    )}
                </Modal>
            )}
        </div>
    )
}

export default Categories;
