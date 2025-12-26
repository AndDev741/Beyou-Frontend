import { CategoryMiniDTO } from "../category/CategoryMiniDTO";

export type task = {
    id: string,
    name: string,
    description?: string,
    iconId: string,
    importance?: number,
    dificulty?: number,
    categories?: Record<string, CategoryMiniDTO>;
    oneTimeTask: boolean,
    markedToDelete: Date,
    createdAt: Date,
    updatedAt: Date
}