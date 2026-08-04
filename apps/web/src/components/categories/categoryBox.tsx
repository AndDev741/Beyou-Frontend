import { useState } from "react"
import { useDispatch } from "react-redux";
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from "lucide-react";
import {editModeEnter ,idEnter, nameEnter, descriptionEnter, iconEnter} from '@beyou/state/category/editCategorySlice'
import deleteCategory from "@beyou/api/categories/deleteCategory";
import getCategories from "@beyou/api/categories/getCategories";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import DeleteModal from "../DeleteModal";
import { enterCategories } from "@beyou/state/category/categoriesSlice";

type props = {id: string, name: string, description: string, iconId: string, level: number, xp: number,
    nextLevelXp: number, actualLevelXp: number
}

function CategoryBox({id, name, description, iconId, level, xp, nextLevelXp}: props){
    const {t} = useTranslation();
    const dispatch = useDispatch();
    const [onDelete, setOnDelete] = useState(false);

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

    const xpPct = nextLevelXp > 0 ? Math.min(100, Math.round((xp / nextLevelXp) * 100)) : 0;

    return(
        // O cartão compacto do mockup: ícone, nome, ações, descrição e a barra
        // de XP — sem expansão. O "usando em" ficou de fora do desenho.
        <Card interactive className="group flex h-full flex-col gap-2.5 break-words">
            <div className="flex items-center gap-2.5">
                <IconTile size={34}>
                    <BeyouIcon id={iconId} size={18} />
                </IconTile>
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug text-text">{name}</h3>

                {/* Editar e excluir no topo: no desktop aparecem ao passar o
                    mouse (ou ao focar por teclado); no telefone ficam sempre
                    visíveis. */}
                <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <IconButton label={t('Edit')} onClick={handleEdit}>
                        <Pencil size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                        <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                </div>
            </div>

            <p className="line-clamp-2 text-[12px] leading-snug text-text-3">{description}</p>

            {/* Categoria acumula o XP dos hábitos: nível e progresso, sem streak. */}
            <div className="mt-auto pt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                        style={{ width: `${xpPct}%` }}
                    />
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-text-3">
                    <span className="font-semibold text-text-2">LV {level}</span>
                    <span>{xp}/{nextLevelXp}</span>
                </div>
            </div>

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
        </Card>
    )
}

export default CategoryBox;
