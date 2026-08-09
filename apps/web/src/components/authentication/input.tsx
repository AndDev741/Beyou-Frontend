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
    /** A visible label above the field (the system's default). */
    label?: string;
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
    label,
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
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="mb-1.5 block text-[12.5px] font-semibold text-text-2"
                >
                    {label}
                </label>
            )}
            <div
                className={`flex w-full items-center gap-2.5 rounded-control border bg-surface px-3 py-[9.5px] text-[13.5px] text-text transition-colors duration-200 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft ${
                    errorMessage ? "border-danger" : "border-border"
                }`}
            >
                {!label && (
                    <label htmlFor={inputId} className="sr-only">
                        {placeholder}
                    </label>
                )}
                <IconStart
                    className="h-[15px] w-[15px] shrink-0 text-text-3"
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
                    className="w-full min-w-0 bg-transparent text-[13.5px] text-text placeholder:text-text-3 focus:outline-none"
                />

                {ShouldRenderToggle && (
                    <button
                        type="button"
                        onClick={handlePasswordType}
                        aria-label={seePasswordIconAlt}
                        className="flex shrink-0 items-center justify-center text-text-3 hover:text-text-2"
                    >
                        {isPasswordVisible && IconToggleVisible ? (
                            <IconToggleVisible className="h-[15px] w-[15px]" aria-hidden="true" focusable="false" />
                        ) : (
                            IconToggleHidden && (
                                <IconToggleHidden className="h-[15px] w-[15px]" aria-hidden="true" focusable="false" />
                            )
                        )}
                    </button>
                )}
            </div>
            {errorMessage && (
                <div className="mt-1.5 w-full">
                    <p className="whitespace-pre-line text-xs leading-snug text-danger">
                        {errorMessage}
                    </p>
                </div>
            )}
        </div>
    );
}

export default Input;
