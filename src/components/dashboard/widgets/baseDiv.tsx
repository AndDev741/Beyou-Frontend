import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode
}

export default function BaseDiv({title, children}: baseDivProps){
    return (
        <div className="flex flex-col items-center justify-center border-solid border-2 border-blueMain p-1 px-4 h-[110px] rounded-md">
            <h2 className="text-lg font-semibold">{title}</h2>
            {children}
        </div>
    )
}