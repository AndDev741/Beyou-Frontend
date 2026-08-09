import GoalForm from "./GoalForm";

type Props = { onClose?: () => void };

function CreateGoal({ onClose }: Props) {
    return <GoalForm mode="create" onClose={onClose} />;
}

export default CreateGoal;
