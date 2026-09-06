import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { BookHeart, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { deleteMoodEntry, saveMoodEntry, setMoodLevel } from '@beyou/api/mood/moodApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import {
    MOOD_LEVELS,
    addDays,
    averageMood,
    journalStreak,
    monthGrid,
    monthRange,
    moodLabelKey,
    nearestLevel,
    removeMoodEntry,
    upsertMoodEntry,
    weekEnding,
} from '@beyou/state';
import { MAX_MOOD_NOTE_LENGTH, type MoodLevel } from '@beyou/types/mood/mood';
import Button from '../../src/ui/Button';
import Card from '../../src/ui/Card';
import DeleteModal from '../../src/ui/DeleteModal';
import EmptyState from '../../src/ui/EmptyState';
import { MOOD_FACES } from '../../src/ui/mood/moodScale';
import useMoodRange from '../../src/ui/useMoodRange';
import useTodayInZone from '../../src/ui/useTodayInZone';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { AppDispatch } from '../../src/store';

/** How many past entries the list shows before it stops being a list and becomes a wall. */
const RECENT_SHOWN = 14;

/**
 * The diary: how the day felt, what was written about it, and the month behind it.
 *
 * Mirror of the web's `/mood`. Tapping a face sends PATCH, which cannot touch the note; the
 * Save button sends PUT, which replaces it. That split is what keeps a one-tap mood change from
 * deleting the morning's writing.
 */
export default function MoodScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { theme } = useBeyouTheme();
    const today = useTodayInZone();

    const [selected, setSelected] = useState(today);
    const [month, setMonth] = useState(() => today.slice(0, 7));
    const [year, monthIndex] = useMemo(() => {
        const [y, m] = month.split('-').map(Number);
        return [y, m - 1];
    }, [month]);

    const range = useMemo(() => monthRange(year, monthIndex), [year, monthIndex]);
    const { byDate, loading, refresh } = useMoodRange(range.from, range.to);
    // The streak and the week average look back across the month boundary, so they read a
    // second window rather than reporting a short run on the first of the month.
    const trailing = useMoodRange(addDays(today, -60), today);

    const entry = byDate[selected] ?? trailing.byDate[selected];
    const [draft, setDraft] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [savingLevel, setSavingLevel] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    /** Which day the box currently reflects. See the seeding effect below. */
    const dayShown = useRef<string | null>(null);

    /**
     * Seeds the box from the stored entry. Same rule as the web page, and it exists for the same
     * bug: keyed on the day alone, the box seeded empty before the day's entry had arrived and
     * never re-seeded, so a day with a journal showed blank — and Save then cleared it.
     *
     * It must never replace typed text with nothing, which a late empty entry would otherwise do.
     */
    useEffect(() => {
        const stored = entry?.note ?? '';
        setDraft((current) => {
            if (dayShown.current === selected && current !== '' && stored === '') return current;
            dayShown.current = selected;
            return stored;
        });
    }, [selected, entry?.id, entry?.note]);

    const selectDay = useCallback(
        (day: string) => {
            if (day > today) return;
            setSelected(day);
            setMonth(day.slice(0, 7));
        },
        [today],
    );

    const pickLevel = async (mood: MoodLevel) => {
        if (savingLevel) return;
        setSavingLevel(true);
        const response = await setMoodLevel(selected, mood, t);
        setSavingLevel(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            return;
        }
        notify.error(getFriendlyErrorMessage(t, response.error));
    };

    const saveNote = async () => {
        if (!entry) {
            notify.info(t('MoodNoteRequiresMood'));
            return;
        }
        setSavingNote(true);
        const trimmed = draft.trim();
        const response = await saveMoodEntry(
            selected,
            { mood: entry.mood, note: trimmed === '' ? null : trimmed },
            t,
        );
        setSavingNote(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            notify.success(t('MoodJournalSaved'));
            return;
        }
        notify.error(getFriendlyErrorMessage(t, response.error));
    };

    const confirmDelete = async () => {
        const day = confirmingDelete;
        if (!day) return;
        setDeleting(true);
        const response = await deleteMoodEntry(day, t);
        setDeleting(false);
        setConfirmingDelete(null);
        if (response.error) {
            notify.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        dispatch(removeMoodEntry(day));
        notify.success(t('MoodEntryDeleted'));
        refresh();
        trailing.refresh();
    };

    const allEntries = useMemo(
        () =>
            Object.values({ ...trailing.byDate, ...byDate })
                .filter((item) => item.date <= today)
                .sort((a, b) => b.date.localeCompare(a.date)),
        [byDate, trailing.byDate, today],
    );
    const streak = useMemo(() => journalStreak(allEntries, today), [allEntries, today]);
    const weekAverage = useMemo(() => {
        const week = weekEnding(today);
        return averageMood(allEntries.filter((item) => week.includes(item.date)));
    }, [allEntries, today]);

    const cells = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex]);
    const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' });
    const longDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });
    const shortDate = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });

    const shiftMonth = (delta: number) => {
        const next = new Date(Date.UTC(year, monthIndex + delta, 1));
        setMonth(next.toISOString().slice(0, 7));
    };

    return (
        <View className="flex-1 bg-bg" style={{ paddingTop: 48 }}>
            <View className="flex-row items-center gap-2 px-4 pb-3">
                <Pressable
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                    accessibilityRole="button"
                    testID="back-button"
                >
                    <ChevronLeft size={24} color={theme.text2} />
                </Pressable>
                <View className="min-w-0">
                    <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
                        {t('MoodPageTitle')}
                    </Text>
                    <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
                        {streak > 0 ? t('MoodStreak', { count: streak }) : t('MoodPageSubtitle')}
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
            >
                <Card className="px-[18px] py-4">
                    <View className="flex-row items-center justify-between">
                        <Pressable
                            onPress={() => selectDay(addDays(selected, -1))}
                            accessibilityRole="button"
                            accessibilityLabel={t('MoodPreviousDay')}
                            testID="mood-previous-day"
                        >
                            <ChevronLeft size={18} color={theme.text2} />
                        </Pressable>
                        <Text className="text-sm font-semibold text-text">
                            {selected === today
                                ? t('MoodToday')
                                : longDate.format(new Date(`${selected}T12:00:00`))}
                        </Text>
                        <Pressable
                            onPress={() => selectDay(addDays(selected, 1))}
                            disabled={selected >= today}
                            accessibilityRole="button"
                            accessibilityLabel={t('MoodNextDay')}
                            accessibilityState={{ disabled: selected >= today }}
                            testID="mood-next-day"
                        >
                            <ChevronRight
                                size={18}
                                color={selected >= today ? theme.text3 : theme.text2}
                            />
                        </Pressable>
                    </View>

                    <View
                        className="mt-4 flex-row items-start justify-between"
                        accessibilityLabel={t('MoodScaleLabel')}
                        testID="mood-scale"
                    >
                        {MOOD_LEVELS.map((level) => {
                            const { Icon, color } = MOOD_FACES[level];
                            const chosen = entry?.mood === level;
                            return (
                                <Pressable
                                    key={level}
                                    onPress={() => pickLevel(level)}
                                    disabled={savingLevel}
                                    accessibilityRole="button"
                                    accessibilityLabel={t(moodLabelKey(level))}
                                    accessibilityState={{ selected: chosen, disabled: savingLevel }}
                                    testID={`mood-scale-${level}`}
                                    className={`items-center gap-1.5 rounded-control px-2 py-1.5 ${
                                        chosen ? 'bg-surface-2' : ''
                                    }`}
                                >
                                    <Icon size={34} color={color(theme)} />
                                    <Text
                                        className={`text-[11px] ${
                                            chosen ? 'font-semibold text-text' : 'text-text-3'
                                        }`}
                                    >
                                        {t(moodLabelKey(level))}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {weekAverage !== null ? (
                        <Text className="mt-3 text-center text-[12.5px] text-text-2">
                            {t('MoodWeekAverage', {
                                mood: t(moodLabelKey(nearestLevel(weekAverage))).toLowerCase(),
                            })}
                        </Text>
                    ) : null}
                </Card>

                <Card className="px-[18px] py-4">
                    <View className="flex-row items-center gap-2">
                        <BookHeart size={14.5} color={theme.text3} />
                        <Text className="text-[12.5px] font-semibold text-text-2">
                            {t('MoodJournalTitle')}
                        </Text>
                    </View>
                    <TextInput
                        value={draft}
                        onChangeText={(text) => setDraft(text.slice(0, MAX_MOOD_NOTE_LENGTH))}
                        placeholder={t('MoodJournalPlaceholder')}
                        placeholderTextColor={theme.text3}
                        multiline
                        textAlignVertical="top"
                        accessibilityLabel={t('MoodJournalTitle')}
                        testID="mood-note"
                        className="mt-3 min-h-[140px] rounded-control border border-border bg-bg p-3 text-sm text-text"
                    />
                    <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[11.5px] text-text-3">
                            {t('MoodJournalCharacters', {
                                count: draft.length,
                                max: MAX_MOOD_NOTE_LENGTH,
                            })}
                        </Text>
                        <Button
                            text={t('MoodJournalSave')}
                            size="small"
                            mode="primary"
                            submitting={savingNote}
                            onPress={saveNote}
                            testID="mood-save-note"
                        />
                    </View>
                </Card>

                <Card className="px-[18px] py-4">
                    <View className="flex-row items-center justify-between">
                        <Pressable
                            onPress={() => shiftMonth(-1)}
                            accessibilityRole="button"
                            accessibilityLabel={t('MoodPreviousMonth')}
                        >
                            <ChevronLeft size={18} color={theme.text2} />
                        </Pressable>
                        <Text className="text-sm font-semibold text-text">
                            {monthLabel.format(new Date(Date.UTC(year, monthIndex, 1)))}
                        </Text>
                        <Pressable
                            onPress={() => shiftMonth(1)}
                            disabled={month >= today.slice(0, 7)}
                            accessibilityRole="button"
                            accessibilityLabel={t('MoodNextMonth')}
                        >
                            <ChevronRight
                                size={18}
                                color={month >= today.slice(0, 7) ? theme.text3 : theme.text2}
                            />
                        </Pressable>
                    </View>

                    <View className="mt-3 flex-row flex-wrap" testID="mood-month">
                        {cells.map((day, index) => {
                            if (!day) {
                                return (
                                    <View
                                        key={`pad-${index}`}
                                        style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                                    />
                                );
                            }
                            const dayEntry = byDate[day];
                            const face = dayEntry ? MOOD_FACES[dayEntry.mood] : null;
                            const future = day > today;
                            const label = `${shortDate.format(new Date(`${day}T12:00:00`))}: ${
                                dayEntry ? t(moodLabelKey(dayEntry.mood)) : t('MoodNotRecorded')
                            }`;
                            return (
                                <Pressable
                                    key={day}
                                    onPress={() => selectDay(day)}
                                    disabled={future}
                                    accessibilityRole="button"
                                    accessibilityLabel={label}
                                    accessibilityState={{ selected: day === selected, disabled: future }}
                                    testID={`mood-day-${day}`}
                                    style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                                    className={`items-center justify-center gap-1 rounded-control border ${
                                        day === selected ? 'border-accent bg-surface-2' : 'border-transparent'
                                    }`}
                                >
                                    <Text
                                        className={`text-[11px] ${future ? 'text-text-3' : 'text-text-2'}`}
                                    >
                                        {Number(day.slice(8))}
                                    </Text>
                                    <View
                                        className={`h-1.5 w-1.5 rounded-full ${face ? face.fill : ''}`}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </Card>

                <Text className="mt-1 text-[12.5px] font-semibold text-text-2">
                    {t('MoodRecentTitle')}
                </Text>
                {allEntries.length === 0 && !loading ? (
                    <EmptyState
                        icon={<BookHeart size={20} color={theme.accent} />}
                        title={t('MoodNoEntriesTitle')}
                        description={t('MoodNoEntriesDescription')}
                        testID="mood-empty-state"
                    />
                ) : (
                    allEntries.slice(0, RECENT_SHOWN).map((item) => {
                        const { Icon, color } = MOOD_FACES[item.mood];
                        return (
                            <Card key={item.date} className="px-[18px] py-3.5">
                                <View className="flex-row items-start gap-3">
                                    <Icon size={22} color={color(theme)} />
                                    <View className="min-w-0 flex-1">
                                        <Pressable
                                            onPress={() => selectDay(item.date)}
                                            accessibilityRole="button"
                                        >
                                            <Text className="text-[12.5px] font-semibold text-text">
                                                {shortDate.format(new Date(`${item.date}T12:00:00`))}
                                                <Text className="font-normal text-text-3">
                                                    {`  ${t(moodLabelKey(item.mood))}`}
                                                </Text>
                                            </Text>
                                        </Pressable>
                                        {item.note ? (
                                            <Text className="mt-1 text-[12.5px] text-text-2">
                                                {item.note}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={() => setConfirmingDelete(item.date)}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('MoodDeleteEntry')}
                                        testID={`mood-delete-${item.date}`}
                                    >
                                        <Trash2 size={16} color={theme.text3} />
                                    </Pressable>
                                </View>
                            </Card>
                        );
                    })
                )}
            </ScrollView>

            <DeleteModal
                visible={confirmingDelete !== null}
                deletePhrase={t('MoodDeleteEntry')}
                name={
                    confirmingDelete
                        ? shortDate.format(new Date(`${confirmingDelete}T12:00:00`))
                        : ''
                }
                onCancel={() => setConfirmingDelete(null)}
                onConfirm={confirmDelete}
                pending={deleting}
                testID="mood-delete-modal"
            />
        </View>
    );
}
