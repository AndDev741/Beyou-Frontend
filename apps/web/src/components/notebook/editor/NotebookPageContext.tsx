import { createContext, useContext } from "react";

/**
 * Which page the editor is showing, for the custom blocks inside it. BlockNote renders blocks
 * through its own React tree, so the page id reaches them through context rather than props.
 */
export type NotebookPageContextValue = {
    pageId: string;
    pageTitle: string;
    cardsTotal: number;
};

export const NotebookPageContext = createContext<NotebookPageContextValue | null>(null);

export function useNotebookPageContext(): NotebookPageContextValue {
    const value = useContext(NotebookPageContext);
    if (!value) throw new Error("A notebook block rendered outside a notebook page");
    return value;
}
