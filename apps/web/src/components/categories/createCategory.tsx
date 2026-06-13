import CategoryForm from "./CategoryForm";
import type categoryGeneratedByAi from "../../types/category/categoryGeneratedByAiType";

type Props = {
    generatedCategory?: categoryGeneratedByAi;
    dispatchFunction: any;
};

function CreateCategory({ generatedCategory, dispatchFunction }: Props) {
    return (
        <CategoryForm
            mode="create"
            generatedCategory={generatedCategory}
            dispatchFunction={dispatchFunction}
        />
    );
}

export default CreateCategory;
