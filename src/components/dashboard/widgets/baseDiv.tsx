import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode,
    bigSize?: boolean
}

export default function BaseDiv({title, children, bigSize}: baseDivProps){
    return (
        <div className={`flex flex-col items-center justify-center border-solid border-2 border-blueMain p-1 sm:px-3 md:px-6 min-h-[110px] max-w-[35vw] md:${bigSize ? "w-[100%]" : ""} rounded-md`}>
            <h2 className="font-semibold text-center md:text-xl">{title}</h2> 
            {children}
        </div>
    )
}