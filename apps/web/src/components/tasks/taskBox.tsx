import { useDispatch } from "react-redux";
import { task } from "@beyou/types/tasks/taskType"
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { attributePhrase, attributeVariant } from "../habits/utils/attributeMeta";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import DeleteModal from "../DeleteModal";
import getTasks from "@beyou/api/tasks/getTasks";
import deleteTask from "@beyou/api/tasks/deleteTask";
import { editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editIdEnter, editImportanceEnter, editModeEnter, editNameEnter, editOneTimeTaskEnter } from "@beyou/state/task/editTaskSlice";
import { MdWarningAmber } from "react-icons/md";
import { CategoryMiniDTO } from "@beyou/types/category/CategoryMiniDTO";

type taskBoxProps = {
    id: string,
    name: string,
    description: string,
    iconId: string,
    categories?: Record<string, CategoryMiniDTO>,
    importance?:number,
    dificulty?: number,
    oneTimeTask: boolean,
    createdAt: Date,
    updatedAt: Date,
    markedToDelete: Date,
    setTasks: React.Dispatch<React.SetStateAction<task[]>>
}

function TaskBox({id, iconId, name, description, categories, importance, dificulty, oneTimeTask, markedToDelete, setTasks}: taskBoxProps){
    const dispatch = useDispatch();

    const {t} = useTranslation();
    const [onDelete, setOnDelete] = useState(false);

    const dificultyPhrase = attributePhrase("difficulty", dificulty, t);
    const importancePhrase = attributePhrase("importance", importance, t);
    const categoryEntries = Object.entries(categories ?? {});

    function handleEditMode(){
        dispatch(editModeEnter(true));
        dispatch(editIdEnter(id))
        dispatch(editNameEnter(name));
        dispatch(editDescriptionEnter(description));
        dispatch(editIconIdEnter(iconId));
        dispatch(editImportanceEnter(importance));
        dispatch(editDificultyEnter(dificulty));
        dispatch(editCaegoriesIdEnter(categories));
        dispatch(editOneTimeTaskEnter(oneTimeTask));
    }

    return(
        <Card interactive className="group flex h-full flex-col gap-3 break-words">
            <div className="flex items-start gap-2.5">
                <IconTile size={38}>
                    <BeyouIcon id={iconId} size={20} />
                </IconTile>
                <h2 className="min-w-0 flex-1 pt-1 text-base font-semibold leading-snug text-text line-clamp-1">{name}</h2>

                {/* A task does not expand: importance and difficulty already show on
                    the closed card, and expanding only revealed these actions. They
                    move up to the top — hover on desktop, always on a phone. */}
                <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <IconButton label={t('Edit')} onClick={handleEditMode}>
                        <Pencil size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                        <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                </div>
            </div>

            {oneTimeTask && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Chip size="sm" icon={<MdWarningAmber aria-hidden="true" />}>{t('One Time Task')}</Chip>
                    {markedToDelete ? <Chip size="sm" variant="danger">{t('And Marked to Delete')}</Chip> : null}
                </div>
            )}

            <p className="line-clamp-2 text-sm leading-snug text-text-2">{description}</p>

            {categoryEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {categoryEntries.map(([categoryId, {name: categoryName, iconId: categoryIconId}], index) => (
                        <Chip key={`${categoryId}-${index}`} size="sm" icon={<BeyouIcon id={categoryIconId} size={12} />}>
                            {categoryName}
                        </Chip>
                    ))}
                </div>
            )}

            {/* A task has no level: the card's footer is importance and difficulty. */}
            {(importancePhrase || dificultyPhrase) && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {importancePhrase && (
                        <Chip size="sm" variant={attributeVariant(importance)}>
                            {/* The label rides along: "Medium" alone does not say
                                importance or difficulty. */}
                            <span className="font-normal opacity-70">{t('Importance')}</span>
                            <span aria-hidden="true" className="opacity-50">·</span>
                            {importancePhrase}
                        </Chip>
                    )}
                    {dificultyPhrase && (
                        <Chip size="sm" variant={attributeVariant(dificulty)}>
                            <span className="font-normal opacity-70">{t('Difficulty')}</span>
                            <span aria-hidden="true" className="opacity-50">·</span>
                            {dificultyPhrase}
                        </Chip>
                    )}
                </div>
            )}

            <DeleteModal
            objectId={id}
            onDelete={onDelete}
            setOnDelete={setOnDelete}
            t={t}
            name={name}
            setObjects={setTasks}
            deleteObject={deleteTask}
            getObjects={getTasks}
            deletePhrase={t('ConfirmDeleteOfTaskPhrase')}
            mode="task"
            />
        </Card>
    )
}

export default TaskBox;
