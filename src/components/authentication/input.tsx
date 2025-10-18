import { useMemo, useState } from "react";
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
}: InputProps) {
    const isPasswordField = useMemo(() => inputType === "password", [inputType]);
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
            <label
                className={`flex items-center border-2 border-solid rounded-md w-[90vw] lg:w-[100%] h-[64px] bg-background transition-colors duration-200 ${
                    errorMessage ? "border-error" : "border-primary"
                }`}
            >
                <IconStart
                    className="w-[35px] m-2 text-icon"
                    aria-hidden="true"
                    focusable="false"
                />

                <input
                    type={currentType}
                    placeholder={placeholder}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-[100%] lg2:w-[400px] lg:w-[300px] text-2xl sm:text-3xl ml-5 rounded-md focus:outline-none bg-background text-secondary placeholder:text-placeholder"
                />

                {ShouldRenderToggle && (
                    <button
                        type="button"
                        onClick={handlePasswordType}
                        aria-label={seePasswordIconAlt}
                        className="mx-4 flex items-center justify-center"
                    >
                        {isPasswordVisible && IconToggleVisible ? (
                            <IconToggleVisible className="w-[35px] text-icon" aria-hidden="true" focusable="false" />
                        ) : (
                            IconToggleHidden && (
                                <IconToggleHidden className="w-[35px] text-icon" aria-hidden="true" focusable="false" />
                            )
                        )}
                    </button>
                )}
            </label>
            <p className={`${errorMessage ? "block text-error underline text-xl text-center" : "hidden"}`}>
                {errorMessage}
            </p>
        </>
    );
}

export default Input;
