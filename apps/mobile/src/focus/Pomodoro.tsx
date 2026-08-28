import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pause, Play, RotateCcw, Settings2, X } from 'lucide-react-native';
import {
  CYCLE_KINDS,
  CYCLE_LABEL_KEY,
  CYCLE_MESSAGE_KEY,
  cycleMinutes,
  type CycleKind,
  type FocusItem,
} from '@beyou/state';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { usePomodoro } from './usePomodoro';

/**
 * The timer: three cycles, one panel. Native twin of the web component.
 *
 * Painted on `bg-accent` with `text-on-accent`, the SAME colour for all three cycles. A colour
 * per cycle is the obvious idea and a trap: there is no `on-success` or `on-xp` token, so a green
 * or amber panel would carry unreadable text in the dark themes, where those tokens are the light
 * ones. `on-accent` exists precisely to stay readable over `accent` in all nine themes. The cycle
 * is carried by the tab and by the line under the clock.
 *
 * All three lengths are editable. A pomodoro's is pre-filled from the item's own window when it
 * has one, because routine items already carry `startTime` and `endTime`; a break always takes
 * its configured length, since an item's window says nothing about how long a rest should be.
 *
 * There is no failure state: a finished cycle hands over and waits to be started, resetting has
 * no consequence, and only finished pomodoros are counted.
 */
export default function Pomodoro({ item, date }: { item: FocusItem; date: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const {
    status,
    formatted,
    selectedCycle,
    settings,
    number,
    runningCycle,
    selectCycle,
    changeSettings,
    start,
    pause,
    resume,
    stop,
  } = usePomodoro(item.groupId, date);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const idle = status === 'idle';
  const previewFor = (kind: CycleKind) =>
    `${String(cycleMinutes(kind, item, settings)).padStart(2, '0')}:00`;

  // While something runs the clock shows THAT cycle. Idle, it previews the selected tab's
  // length, so switching tabs changes the number.
  const shown = idle ? previewFor(selectedCycle) : formatted;
  const message = t(CYCLE_MESSAGE_KEY[idle ? selectedCycle : runningCycle]);
  const startSelected = () => start(selectedCycle, cycleMinutes(selectedCycle, item, settings));

  return (
    <View className="gap-3" testID="focus-pomodoro">
      <View className="rounded-card bg-accent px-4 py-6">
        <View className="flex-row items-center gap-1">
          {/* The tabs stay live during a cycle: looking at the Long Break tab while a pomodoro
              counts down is reasonable, and the clock keeps showing the running cycle. */}
          <View className="flex-1 flex-row items-center justify-center gap-1">
            {CYCLE_KINDS.map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCycle === kind }}
                onPress={() => selectCycle(kind)}
                className={`rounded-control px-2.5 py-1.5 ${
                  selectedCycle === kind ? 'bg-on-accent/20' : ''
                }`}
                testID={`focus-cycle-tab-${kind}`}
              >
                <Text
                  className={`text-[12.5px] text-on-accent ${
                    selectedCycle === kind ? 'font-semibold' : 'font-medium opacity-80'
                  }`}
                >
                  {t(CYCLE_LABEL_KEY[kind])}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('FocusSettings')}
            onPress={() => setSettingsOpen((open) => !open)}
            className="h-8 w-8 items-center justify-center rounded-control"
            testID="focus-pomodoro-settings-toggle"
          >
            {settingsOpen ? (
              <X size={16} color={theme.onAccent} />
            ) : (
              <Settings2 size={16} color={theme.onAccent} />
            )}
          </Pressable>
        </View>

        <Text
          className="mt-5 text-center font-mono text-[64px] font-bold text-on-accent"
          testID="focus-pomodoro-remaining"
        >
          {shown}
        </Text>

        <View className="mt-6 flex-row items-center justify-center gap-2.5">
          {status === 'running' ? (
            <PanelButton
              label={t('FocusPause')}
              icon={<Pause size={16} color={theme.accent} />}
              onPress={pause}
              testID="focus-pomodoro-pause"
            />
          ) : status === 'paused' ? (
            <PanelButton
              label={t('FocusResume')}
              icon={<Play size={16} color={theme.accent} />}
              onPress={resume}
              testID="focus-pomodoro-resume"
            />
          ) : status === 'elapsed' ? (
            <PanelButton
              label={t('FocusStartNext')}
              icon={<Play size={16} color={theme.accent} />}
              onPress={startSelected}
              testID="focus-pomodoro-next"
            />
          ) : (
            <PanelButton
              label={t('FocusStart')}
              icon={<Play size={16} color={theme.accent} />}
              onPress={startSelected}
              testID="focus-pomodoro-start"
            />
          )}

          {/* Only when there is something to reset, and quiet: resetting has no consequence,
              since nothing is recorded and nothing is lost. */}
          {idle ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('FocusStop')}
              onPress={stop}
              className="h-11 w-11 items-center justify-center rounded-control"
              testID="focus-pomodoro-stop"
            >
              <RotateCcw size={17} color={theme.onAccent} />
            </Pressable>
          )}
        </View>

        {settingsOpen ? (
          <View
            className="mt-6 border-t border-on-accent/20 pt-4"
            testID="focus-pomodoro-settings"
          >
            <View className="flex-row gap-2.5">
              {CYCLE_KINDS.map((kind) => (
                <View key={kind} className="flex-1 gap-1.5">
                  <Text className="text-[11px] font-medium text-on-accent opacity-85">
                    {t(CYCLE_LABEL_KEY[kind])}
                  </Text>
                  <TextInput
                    value={String(settings[kind])}
                    onChangeText={(next) => changeSettings({ [kind]: Number(next) })}
                    keyboardType="number-pad"
                    className="h-10 rounded-control bg-on-accent/15 text-center font-mono text-[15px] text-on-accent"
                    testID={`focus-setting-${kind}`}
                  />
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-[12px] text-on-accent opacity-85">
                {t('FocusLongBreakEvery')}
              </Text>
              <TextInput
                value={String(settings.longBreakEvery)}
                onChangeText={(next) => changeSettings({ longBreakEvery: Number(next) })}
                keyboardType="number-pad"
                className="h-9 w-14 rounded-control bg-on-accent/15 text-center font-mono text-[14px] text-on-accent"
                testID="focus-setting-longBreakEvery"
              />
              <Text className="text-[12px] text-on-accent opacity-85">
                {t('FocusLongBreakEveryUnit')}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View className="items-center">
        <Text className="font-mono text-[12.5px] text-text-3" testID="focus-pomodoro-number">
          {t('FocusCycleNumber', { number })}
        </Text>
        <Text
          className="mt-0.5 text-sm font-medium text-text-2"
          testID="focus-pomodoro-message"
        >
          {message}
        </Text>
      </View>

      {/*
       * F4 slots in here: the break's micro-tasks, under the message exactly as in the reference
       * design. Deliberately nothing is rendered yet rather than an inert "Add task" control,
       * because a button that does nothing is worse than an honest gap.
       */}
    </View>
  );
}

/** The one light action on the accent panel, so it reads as the thing to do. */
function PanelButton({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 min-w-[132px] flex-row items-center justify-center gap-2 rounded-control bg-surface active:opacity-90"
      testID={testID}
    >
      {icon}
      <Text className="text-[15px] font-bold uppercase text-accent">{label}</Text>
    </Pressable>
  );
}
