import CategoryForm from "./CategoryForm";
import type categoryGeneratedByAi from "@beyou/types/category/categoryGeneratedByAiType";

type Props = {
    generatedCategory?: categoryGeneratedByAi;
    dispatchFunction: any;
    onClose?: () => void;
};

function CreateCategory({ generatedCategory, dispatchFunction, onClose }: Props) {
    return (
        <CategoryForm
            mode="create"
            generatedCategory={generatedCategory}
            dispatchFunction={dispatchFunction}
            onClose={onClose}
        />
    );
}

export default CreateCategory;
