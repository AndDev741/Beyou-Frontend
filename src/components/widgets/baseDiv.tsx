import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode,
    bigSize?: boolean
}

export default function BaseDiv({title, children, bigSize}: baseDivProps){
    return (
        <div className={`flex flex-col items-center justify-center border-solid border-2 border-primary p-1 sm:px-3 md:px-6 min-w-[120px] min-h-[110px] max-w-[35vw] md:max-w-[100vh] md:${bigSize ? "w-[100%]" : ""} rounded-md`}>
            <div className=" relative flex items-center justify-center">
                <h2 className="font-semibold text-center md:text-xl text-secondary">{title}</h2>
            </div>
           
            {children}
        </div>
    )
}