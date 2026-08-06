import { useState } from "react";
import { ChevronDown, ChevronUp, Flame, Pencil, Trash2 } from "lucide-react";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import StatTile from "../../ui/StatTile";
import XpBar from "../../ui/XpBar";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { editIdEnter ,editCaegoriesIdEnter, editDescriptionEnter, editDificultyEnter, editIconIdEnter, editImportanceEnter, editModeEnter, editMotivationalPhraseEnter, editNameEnter } from "@beyou/state/habit/editHabitSlice";
import { habit } from "@beyou/types/habit/habitType";
import deleteHabit from "@beyou/api/habits/deleteHabit";
import getHabits from "@beyou/api/habits/getHabits";
import { attributePhrase, attributeVariant } from "./utils/attributeMeta";
import DeleteModal from "../DeleteModal";

interface HabitBoxProps extends habit {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>
}

function HabitBox({id, iconId, name, description, level, xp, nextLevelXp, constance, categories, routines, motivationalPhrase, importance, dificulty, setHabits}: HabitBoxProps){
    const dispatch = useDispatch();

    const {t} = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [onDelete, setOnDelete] = useState(false);

    const dificultyPhrase = attributePhrase("difficulty", dificulty, t);
    const importancePhrase = attributePhrase("importance", importance, t);
    const routineNames = Object.values(routines ?? {});

    const handleExpanded = () => {
        setExpanded(!expanded);
    }

    function handleEditMode(){
        dispatch(editModeEnter(true));
        dispatch(editIdEnter(id))
        dispatch(editNameEnter(name));
        dispatch(editDescriptionEnter(description));
        dispatch(editMotivationalPhraseEnter(motivationalPhrase));
        dispatch(editIconIdEnter(iconId));
        dispatch(editImportanceEnter(importance));
        dispatch(editDificultyEnter(dificulty));
        dispatch(editCaegoriesIdEnter(categories));
    }

    return(
        <Card interactive className="group flex h-full flex-col gap-3 break-words">
            <div className="flex items-start gap-2.5">
                <IconTile size={38}>
                    <BeyouIcon id={iconId} size={20} />
                </IconTile>
                <h2 className={`min-w-0 flex-1 pt-1 text-base font-semibold leading-snug text-text ${expanded ? "" : "line-clamp-1"}`}>{name}</h2>

                {/* Editar e excluir no topo, à esquerda do chevron: no desktop
                    aparecem no hover (ou no foco por teclado); no telefone
                    ficam sempre visíveis. */}
                <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <IconButton label={t('Edit')} onClick={handleEditMode}>
                        <Pencil size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t('Delete')} tone="danger" onClick={() => setOnDelete(true)}>
                        <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                </div>

                <IconButton
                    label={expanded ? t('Collapse') : t('Expand')}
                    aria-expanded={expanded}
                    onClick={handleExpanded}
                >
                    {expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                </IconButton>
            </div>

            {/* A descrição fica no cartão em duas linhas — expandir só solta o clamp. */}
            <p className={`text-sm leading-snug text-text-2 ${expanded ? "" : "line-clamp-2"}`}>{description}</p>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {categories.map((category, index) => (
                        <Chip key={`${category.id}-${index}`} size="sm" icon={<BeyouIcon id={category.iconId} size={12} />}>
                            {category.name}
                        </Chip>
                    ))}
                </div>
            )}

            {expanded && routineNames.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">{t('UsingIn')}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {routineNames.map((routineName) => (
                            <Chip key={routineName} size="sm">{routineName}</Chip>
                        ))}
                    </div>
                </div>
            )}

            {expanded && motivationalPhrase && (
                <div className="rounded-control border-l-2 border-accent bg-surface-2 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{t('MotivationPhrase')}</p>
                    <p className="mt-0.5 text-sm italic text-text-2">{motivationalPhrase}</p>
                </div>
            )}

            {expanded && (importancePhrase || dificultyPhrase) && (
                <div className="flex flex-wrap gap-1.5">
                    {importancePhrase && (
                        <Chip size="sm" variant={attributeVariant(importance)} title={t('Importance')}>
                            {importancePhrase}
                        </Chip>
                    )}
                    {dificultyPhrase && (
                        <Chip size="sm" variant={attributeVariant(dificulty)} title={t('Difficulty')}>
                            {dificultyPhrase}
                        </Chip>
                    )}
                </div>
            )}

            {expanded && (
                <div className="grid grid-cols-2 gap-2">
                    <StatTile label={t('Level')} value={level} hint={`${xp}/${nextLevelXp} XP`} />
                    <StatTile label={t('Constance')} value={constance} hint={t('Days')} />
                </div>
            )}

            {/* A linha que se lê de relance: nível, XP e streak. */}
            <div className="mt-auto flex items-end gap-3 pt-1">
                <XpBar className="min-w-0 flex-1" current={xp} target={nextLevelXp} level={level} />
                {/* Sem sequência não há o que celebrar: uma chama apagada com
                    zero ao lado lê como falha, não como estado neutro. */}
                {constance > 0 && (
                    <Chip
                        variant="flame"
                        size="sm"
                        className="font-mono"
                        icon={<Flame size={12} aria-hidden="true" />}
                        title={t('Constance')}
                    >
                        {constance}
                    </Chip>
                )}
            </div>

            <DeleteModal
            objectId={id}
            onDelete={onDelete}
            setOnDelete={setOnDelete}
            t={t}
            name={name}
            setObjects={setHabits}
            deleteObject={deleteHabit}
            getObjects={getHabits}
            deletePhrase={t('ConfirmDeleteOfHabitPhrase')}
            mode="habit"
            />
        </Card>
    )
}

export default HabitBox;
