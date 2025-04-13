import category from "../category/categoryType"

export type task = {
    id: string,
    name: string,
    description?: string,
    iconId: string,
    importance?: number,
    dificulty?: number,
    categories?: category[],
    createdAt: Date,
    updatedAt: Date
}