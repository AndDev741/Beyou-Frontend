import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode,
    /** Header icon (14.5px, in text-3). */
    icon?: ReactNode,
    /** Action right of the title (menu, shortcut). */
    action?: ReactNode,
    bigSize?: boolean
}

/**
 * Every rail widget's frame: the surface, a quiet header with an icon, and the
 * content below. `bigSize` is left over from the old layout and today only affects
 * phones, where the carousel gives every widget the full width.
 */
export default function BaseDiv({ title, children, icon, action }: baseDivProps) {
    return (
        <div className="rounded-card border border-border bg-surface px-[18px] py-4">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text-2">
                {icon && <span className="text-text-3">{icon}</span>}
                {title}
                {action && <span className="ml-auto text-text-3">{action}</span>}
            </div>
            {children}
        </div>
    )
}
