import { useId, useMemo, useState } from "react";
import type { FunctionComponent, SVGProps } from "react";

type IconComponent = FunctionComponent<
    SVGProps<SVGSVGElement> & { title?: string }
>;

type InputProps = {
    icon1: IconComponent;
    placeholder: string;
    inputType: string;
    icon2: IconComponent | null;
    icon3: IconComponent | null;
    seePasswordIconAlt: string;
    data: string;
    setData: React.Dispatch<React.SetStateAction<string>>;
    errorMessage: string;
    testId?: string;
    autoComplete?: string;
};

function Input({
    icon1: IconStart,
    placeholder,
    inputType,
    icon2: IconToggleHidden,
    icon3: IconToggleVisible,
    seePasswordIconAlt,
    data,
    setData,
    errorMessage,
    testId,
    autoComplete,
}: InputProps) {
    const isPasswordField = useMemo(() => inputType === "password", [inputType]);
    const inputId = useId();
    const [currentType, setCurrentType] = useState(inputType);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handlePasswordType = () => {
        if (!isPasswordField) return;
        setIsPasswordVisible((prev) => !prev);
        setCurrentType((prevType) => (prevType === "password" ? "text" : "password"));
    };

    const ShouldRenderToggle = Boolean(IconToggleHidden && IconToggleVisible && isPasswordField);

    return (
        <>
            <div
                // Largura vem do container (o cartão do AuthShell); 90vw fixo
                // estourava para fora dele.
                className={`flex h-12 w-full items-center rounded-control border bg-surface transition-colors duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 ${
                    errorMessage ? "border-danger" : "border-border"
                }`}
            >
                <label htmlFor={inputId} className="sr-only">
                    {placeholder}
                </label>
                <IconStart
                    className="mx-3 w-[18px] shrink-0 text-text-3"
                    aria-hidden="true"
                    focusable="false"
                />

                <input
                    id={inputId}
                    type={currentType}
                    placeholder={placeholder}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    data-testid={testId}
                    autoComplete={autoComplete}
                    className="w-full min-w-0 bg-transparent text-base text-text placeholder:text-text-3 focus:outline-none"
                />

                {ShouldRenderToggle && (
                    <button
                        type="button"
                        onClick={handlePasswordType}
                        aria-label={seePasswordIconAlt}
                        className="mx-3 flex shrink-0 items-center justify-center text-text-3 hover:text-text-2"
                    >
                        {isPasswordVisible && IconToggleVisible ? (
                            <IconToggleVisible className="h-5 w-5" aria-hidden="true" focusable="false" />
                        ) : (
                            IconToggleHidden && (
                                <IconToggleHidden className="h-5 w-5" aria-hidden="true" focusable="false" />
                            )
                        )}
                    </button>
                )}
            </div>
            {errorMessage && (
                <div className="mt-1 w-full">
                    <p className="whitespace-pre-line text-xs leading-snug text-danger">
                        {errorMessage}
                    </p>
                </div>
            )}
        </>
    );
}

export default Input;
