import { useState } from "react"
import { useDispatch } from "react-redux";
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import {editModeEnter ,idEnter, nameEnter, descriptionEnter, iconEnter} from '@beyou/state/category/editCategorySlice'
import deleteCategory from "@beyou/api/categories/deleteCategory";
import getCategories from "@beyou/api/categories/getCategories";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import XpBar from "../../ui/XpBar";
import DeleteModal from "../DeleteModal";
import { enterCategories } from "@beyou/state/category/categoriesSlice";

type props = {id: string, name: string, description: string, iconId: string, level: number, xp: number,
    nextLevelXp: number, actualLevelXp: number,
    habits?: Map<string, string>,
    tasks?: Map<string, string>,
    goals?: Map<string, string>

}

function CategoryBox({id, name, description, iconId, level, xp, nextLevelXp, habits, tasks, goals}: props){
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const [expanded, setExpanded] = useState(false);
    const [onDelete, setOnDelete] = useState(false);

    const usedIn: { label: string, names: string[] }[] = [
        { label: t('Habits'), names: [...(habits?.values() ?? [])] },
        { label: t('Tasks'), names: [...(tasks?.values() ?? [])] },
        { label: t('Goals'), names: [...(goals?.values() ?? [])] },
    ].filter((group) => group.names.length > 0);

    const handleEdit = () => {
        dispatch(editModeEnter(true));
        dispatch(idEnter(id));
        dispatch(nameEnter(name));
        dispatch(descriptionEnter(description));
        dispatch(iconEnter(iconId));

        //Scroll to bottom if mobile
        if(window.innerWidth <= 1100){
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            })
        }
    }

    return(
        <Card interactive className="group flex h-full flex-col gap-3 break-words">
            <div className="flex items-start gap-2.5">
                <IconTile size={38}>
                    <BeyouIcon id={iconId} size={20} />
                </IconTile>
                <h3 className={`min-w-0 flex-1 pt-1 text-base font-semibold leading-snug text-text ${expanded ? "" : "line-clamp-1"}`}>{name}</h3>

                {/* Editar e excluir no topo, à esquerda do chevron: no desktop
                    aparecem ao passar o mouse (ou ao focar por teclado); no
                    telefone ficam sempre visíveis. */}
                <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <IconButton label={t('Edit')} onClick={handleEdit}>
                        <Pencil size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                        <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                </div>

                <IconButton
                    label={expanded ? t('Collapse') : t('Expand')}
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                </IconButton>
            </div>

            {/* A descrição fica no cartão em duas linhas — expandir só solta o clamp. */}
            <p className={`text-sm leading-snug text-text-2 ${expanded ? "" : "line-clamp-2"}`}>{description}</p>

            {expanded && (
                usedIn.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{t('Using in')}</p>
                        {usedIn.map((group) => (
                            <div key={group.label}>
                                <p className="mb-1 text-xs font-semibold text-text-2">{group.label}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.names.map((usedName) => (
                                        <Chip key={usedName} size="sm">{usedName}</Chip>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-3">
                        {t('Add this category in a habit, task or goal!')}
                    </p>
                )
            )}

            {/* Categoria acumula o XP dos hábitos: nível e progresso, sem streak.
                Fica DEPOIS do "usando em" — o conteúdo expandido termina na
                barra, não cortado por uma borda. */}
            <XpBar className="pt-1" current={xp} target={nextLevelXp} level={level} />

            {expanded && (
                <DeleteModal objectId={id}
                onDelete={onDelete}
                setOnDelete={setOnDelete}
                t={t} name={name}
                setObjects={null}
                deleteObject={deleteCategory}
                getObjects={getCategories}
                deletePhrase={t('ConfirmDeleteOfCategoryPhrase')}
                mode="category"
                dispatchFunction={enterCategories}
                />
            )}
        </Card>
    )
}

export default CategoryBox;
