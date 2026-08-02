import { MouseEventHandler } from "react"

export default function SmallButton({text, disabled, onClick}: {text: string, disabled: boolean, onClick: MouseEventHandler<HTMLButtonElement>}){
    return (
        <button
            className="px-4 py-2 bg-accent text-on-accent rounded-control font-semibold hover:bg-accent/90 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onClick}
        >
            {text}
        </button>
    )
}