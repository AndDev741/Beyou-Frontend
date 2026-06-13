import { MouseEventHandler } from "react"

export default function SmallButton({text, disabled, onClick}: {text: string, disabled: boolean, onClick: MouseEventHandler<HTMLButtonElement>}){
    return (
        <button
            className="px-4 py-2 bg-primary text-background dark:text-secondary rounded-lg font-semibold hover:bg-primary/90 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onClick}
        >
            {text}
        </button>
    )
}