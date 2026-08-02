import CategoryForm from "./CategoryForm";

type Props = { dispatchFunction: any; onClose?: () => void };

function EditCategory({ dispatchFunction, onClose }: Props) {
    return <CategoryForm mode="edit" dispatchFunction={dispatchFunction} onClose={onClose} />;
}

export default EditCategory;
