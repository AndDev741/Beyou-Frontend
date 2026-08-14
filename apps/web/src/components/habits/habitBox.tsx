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
import LastTwoWeeksStrip from "./lastTwoWeeksStrip";
import { formatFirstCheckIn } from "@beyou/state";
import useTodayInZone from "../../hooks/useTodayInZone";

interface HabitBoxProps extends habit {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>
}

function HabitBox({id, iconId, name, description, level, xp, nextLevelXp, currentStreak, bestStreak, totalCheckIns, firstCheckInDate, streakDormant, categories, routines, motivationalPhrase, importance, dificulty, setHabits}: HabitBoxProps){
    const dispatch = useDispatch();

    const {t, i18n} = useTranslation();
    // A day that turns at midnight: "since 12 Jun" drops the year only while the
    // first check-in is inside the CURRENT year, so the anchor cannot be stale.
    const anchor = useTodayInZone();
    const [expanded, setExpanded] = useState(false);
    const [onDelete, setOnDelete] = useState(false);

    const dificultyPhrase = attributePhrase("difficulty", dificulty, t);
    const importancePhrase = attributePhrase("importance", importance, t);
    const routineNames = Object.values(routines ?? {});
    // Never checked: the "since" line has nothing to say, so it says that instead of
    // rendering an empty date.
    const sinceLabel = firstCheckInDate
        ? `${t('Since')} ${formatFirstCheckIn(firstCheckInDate, i18n.language, anchor)}`
        : t('NoCheckInsYet');

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

                {/* Edit and delete at the top, left of the chevron: on desktop they
                    appear on hover (or on keyboard focus); on a phone they are always
                    visible. */}
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

            {/* The description sits on the card in two lines — expanding only releases the clamp. */}
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

            {/* Two columns, with check-ins across the bottom.
                The mockup drew three abreast in a 432px panel; here the card is one
                of three in a 1100px grid, so the row has ~289px and three tiles come
                out 91px wide — narrow enough that "CONSTÂNCIA" breaks mid-word into
                "CONSTÂNC / IA". A hyphenless break inside a label reads worse than a
                2+1 block, and a 2+1 block that is deliberate reads better than one
                `auto-fit` fell into. */}
            {expanded && (
                <div className="grid grid-cols-2 gap-2">
                    <StatTile label={t('Level')} value={level} hint={`${xp}/${nextLevelXp} XP`} />
                    <StatTile
                        label={t('Constance')}
                        value={`${currentStreak} ${t('DaysUnit', { count: currentStreak })}`}
                        hint={streakDormant && currentStreak > 0
                            ? t('StreakPaused')
                            : bestStreak > 0 ? `${t('Best')}: ${bestStreak}` : undefined}
                    />
                    <StatTile
                        className="col-span-2"
                        label={t('CheckIns')}
                        value={totalCheckIns}
                        hint={sinceLabel}
                    />
                </div>
            )}

            {expanded && <LastTwoWeeksStrip ownerType="HABIT" ownerId={id} />}

            {/* The row you read at a glance: level, XP and streak. */}
            <div className="mt-auto flex items-end gap-3 pt-1">
                <XpBar className="min-w-0 flex-1" current={xp} target={nextLevelXp} level={level} />
                {/* With no streak there is nothing to celebrate: a dim flame with a
                    zero beside it reads as failure, not as a neutral state.
                    A dormant run keeps its number but loses the flame — the run has
                    not broken, it just is not burning. */}
                {currentStreak > 0 && (
                    <Chip
                        variant={streakDormant ? "neutral" : "flame"}
                        size="sm"
                        className="font-mono"
                        icon={<Flame size={12} aria-hidden="true" />}
                        title={streakDormant ? t('StreakPausedExplanation') : t('Constance')}
                    >
                        {currentStreak}
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
