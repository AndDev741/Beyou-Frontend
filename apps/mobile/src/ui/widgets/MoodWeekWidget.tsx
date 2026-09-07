import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { Smile } from 'lucide-react-native';
import { setMoodLevel } from '@beyou/api/mood/moodApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { MOOD_LEVELS, addDays, moodLabelKey, upsertMoodEntry, weekEnding } from '@beyou/state';
import type { MoodLevel } from '@beyou/types/mood/mood';
import WidgetCard from './WidgetCard';
import { MOOD_FACES } from '../mood/moodScale';
import useMoodRange from '../useMoodRange';
import useTodayInZone from '../useTodayInZone';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';

/**
 * The week's moods, and a one-tap way to mark today. Mirror of the web's `moodWeek`.
 *
 * Two states in one card. Today unmarked: the five faces, and tapping one records it. Today
 * marked: seven dots for the week with today ringed; tapping today's dot brings the faces back.
 *
 * It writes through PATCH, never PUT, so it cannot clear a journal entry it never loaded.
 */
export default function MoodWeekWidget() {
    const { t, i18n } = useTranslation();
    const { theme } = useBeyouTheme();
    const dispatch = useDispatch();
    const router = useRouter();
    const today = useTodayInZone();
    const week = useMemo(() => weekEnding(today), [today]);
    const { byDate, loading } = useMoodRange(addDays(today, -6), today);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    const todayEntry = byDate[today];
    const showFaces = editing || (!loading && !todayEntry);

    const pick = async (mood: MoodLevel) => {
        if (saving) return;
        setSaving(true);
        const response = await setMoodLevel(today, mood, t);
        setSaving(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            setEditing(false);
            return;
        }
        notify.error(getFriendlyErrorMessage(t, response.error));
    };

    const weekdayOf = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
    const dayLabel = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });

    return (
        <WidgetCard
            title={showFaces ? t('HowAreYouToday') : t('MoodYourWeek')}
            icon={<Smile size={14.5} color={theme.text3} />}
            action={
                <Pressable onPress={() => router.push('/mood')} accessibilityRole="button">
                    <Text className="text-[11.5px] font-medium text-text-3">
                        {t('MoodWriteAction')}
                    </Text>
                </Pressable>
            }
            testID="mood-week-widget"
        >
            {showFaces ? (
                <View className="mt-3" testID="mood-week-faces">
                    <View className="flex-row items-center justify-between">
                        {MOOD_LEVELS.map((level) => {
                            const { Icon, color } = MOOD_FACES[level];
                            const chosen = todayEntry?.mood === level;
                            return (
                                <Pressable
                                    key={level}
                                    onPress={() => pick(level)}
                                    disabled={saving}
                                    accessibilityRole="button"
                                    accessibilityLabel={t(moodLabelKey(level))}
                                    accessibilityState={{ selected: chosen, disabled: saving }}
                                    testID={`mood-face-${level}`}
                                    className={`h-11 w-11 items-center justify-center rounded-full border ${
                                        chosen ? 'border-transparent bg-surface-2' : 'border-border'
                                    }`}
                                >
                                    <Icon size={22} color={color(theme)} />
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text className="mt-2.5 text-[11.5px] text-text-3">
                        {t('MoodWidgetEmptyHint')}
                    </Text>
                </View>
            ) : (
                <View className="mt-3 flex-row items-end justify-between" testID="mood-week-strip">
                    {week.map((day) => {
                        const entry = byDate[day];
                        const face = entry ? MOOD_FACES[entry.mood] : null;
                        const isToday = day === today;
                        const label = `${dayLabel.format(new Date(`${day}T12:00:00`))}: ${
                            entry ? t(moodLabelKey(entry.mood)) : t('MoodNotRecorded')
                        }`;
                        // The day's own face, not just its colour — the same five icons the
                        // scale and the month grid use. A day nobody recorded has no face to
                        // show, so it keeps the muted circle, which is also what holds the
                        // row's height steady across a week with gaps in it.
                        const dot = (
                            <View
                                className={`h-7 w-7 items-center justify-center rounded-full ${
                                    face ? '' : 'bg-surface-2'
                                } ${isToday ? 'border-2 border-accent' : ''}`}
                            >
                                {face ? <face.Icon size={22} color={face.color(theme)} /> : null}
                            </View>
                        );
                        return (
                            <View key={day} className="items-center gap-1.5">
                                {isToday ? (
                                    <Pressable
                                        onPress={() => setEditing(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel={label}
                                        testID="mood-week-today"
                                    >
                                        {dot}
                                    </Pressable>
                                ) : (
                                    <View accessibilityLabel={label} accessible>
                                        {dot}
                                    </View>
                                )}
                                <Text className="text-[10.5px] text-text-3">
                                    {weekdayOf.format(new Date(`${day}T12:00:00`))}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </WidgetCard>
    );
}
