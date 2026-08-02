import GoalForm from "./GoalForm";

type Props = { onClose?: () => void };

function EditGoal({ onClose }: Props) {
    return <GoalForm mode="edit" onClose={onClose} />;
}

export default EditGoal;
