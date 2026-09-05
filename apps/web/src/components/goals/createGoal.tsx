import GoalForm from "./GoalForm";

type Props = { onClose?: () => void; defaultParentId?: string };

function CreateGoal({ onClose, defaultParentId }: Props) {
    return <GoalForm mode="create" onClose={onClose} defaultParentId={defaultParentId} />;
}

export default CreateGoal;
