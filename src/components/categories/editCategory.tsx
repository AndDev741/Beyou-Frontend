import CategoryForm from "./CategoryForm";

type Props = { dispatchFunction: any };

function EditCategory({ dispatchFunction }: Props) {
    return <CategoryForm mode="edit" dispatchFunction={dispatchFunction} />;
}

export default EditCategory;
