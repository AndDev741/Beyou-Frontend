import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../Button";
import { aiDescriptionSchema } from "@beyou/validation/forms/aiRoutineSchemas";

type DescribeStepProps = {
    description: string;
    setDescription: (value: string) => void;
    onGenerate: () => void;
    /** "edit" switches the copy to "describe what to change" (AI edit of an existing routine). */
    mode?: "create" | "edit";
};

const DescribeStep = ({ description, setDescription, onGenerate, mode = "create" }: DescribeStepProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState("");

    const handleGenerate = () => {
        const result = aiDescriptionSchema(t).safeParse({ description });
        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }
        setError("");
        onGenerate();
    };

    return (
        <div className="flex w-full flex-col items-center gap-3">
            <p className="text-center text-secondary">
                {mode === "edit" ? t("DescribeRoutineChanges") : t("DescribeYourRoutine")}
            </p>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={mode === "edit" ? t("DescribeChangesPlaceholder") : t("DescribeRoutinePlaceholder")}
                maxLength={2000}
                rows={6}
                data-testid="ai-description"
                className="w-full resize-none rounded-md border-2 border-primary/40 bg-background p-3 text-secondary placeholder:text-placeholder focus:border-primary focus:outline-none"
            />
            <span className="self-end text-xs text-description">{description.length}/2000</span>
            {error && <p className="text-center text-error">{error}</p>}
            <Button text={t("GenerateRoutine")} size="big" mode="create" onClick={handleGenerate} testId="ai-generate" />
        </div>
    );
};

export default DescribeStep;
