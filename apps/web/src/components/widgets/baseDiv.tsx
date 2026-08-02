import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode,
    bigSize?: boolean
}

/** A moldura de todo widget do dashboard: superfície, título discreto, conteúdo. */
export default function BaseDiv({ title, children, bigSize }: baseDivProps) {
    return (
        <div
            className={`flex min-h-[120px] min-w-[160px] flex-col rounded-card border border-border bg-surface p-4 lg:min-w-[220px] ${
                bigSize ? "w-[90%]" : "max-w-[35vw] md:max-w-[100vh]"
            }`}
        >
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-3">
                {title}
            </h2>
            <div className="flex flex-1 flex-col items-center justify-center gap-1">{children}</div>
        </div>
    )
}
