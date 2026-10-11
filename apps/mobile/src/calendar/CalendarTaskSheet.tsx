import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react-native';
import {
  createCalendarTask,
  deleteCalendarTask,
  editCalendarTask,
} from '@beyou/api/calendar/calendarApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { advanceLabelKey } from '@beyou/state';
import {
  CALENDAR_ADVANCE_PRESETS,
  CALENDAR_TASK_NOTE_MAX,
  CALENDAR_TASK_TITLE_MAX,
  type CalendarTask,
} from '@beyou/types/calendar/calendar';
import Button from '../ui/Button';
import DeleteModal from '../ui/DeleteModal';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import FieldLabel from '../ui/form/FieldLabel';
import FormField from '../ui/form/FormField';
import FormModal from '../ui/form/FormModal';
import DateField from '../ui/goals/DateField';
import TimeField from '../ui/routines/TimeField';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { notify } from '../notify';
import { isCalendarTaskGone } from './calendarDay';
import {
  formValuesOf,
  toCalendarTaskInput,
  validateCalendarTaskForm,
  type CalendarTaskFormErrors,
  type CalendarTaskFormValues,
} from './calendarTaskForm';

interface CalendarTaskSheetProps {
  visible: boolean;
  /** The task being edited, or null to create one. */
  task: CalendarTask | null;
  /** The day a new task starts on. Left out, the date starts empty and must be picked. */
  initialDate?: string;
  onClose: () => void;
  /** After a successful create or edit, with the task the server answered. */
  onSaved: (task: CalendarTask) => void;
  /** After a successful delete, or when the task turns out to be gone already. */
  onDeleted: (id: string) => void;
}

/**
 * Create or edit a calendar task (R1, R2, R3): title and date required, time, advance notice
 * and note optional.
 *
 * Deleting asks first. The confirmation REPLACES the form instead of opening on top of it: two
 * native windows stacked is where Android drops taps, and the form's values live here, not in
 * the form window, so coming back from "Cancel" finds everything as it was.
 *
 * A task deleted on another device answers 404 to an edit or a delete. Either way the sheet
 * closes, the task leaves the day and a short toast says why: a delete got what it wanted, and
 * an edit of something gone has nothing left to edit.
 *
 * Returns null when closed: RN's Modal renders its children whatever `visible` says under jest,
 * and a closed sheet has nothing to keep mounted anyway.
 */
export default function CalendarTaskSheet({
  visible,
  task,
  initialDate,
  onClose,
  onSaved,
  onDeleted,
}: CalendarTaskSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const isEdit = task !== null;

  const [values, setValues] = useState<CalendarTaskFormValues>(() => formValuesOf(task, initialDate));
  const [errors, setErrors] = useState<CalendarTaskFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'form' | 'delete'>('form');
  const [deleting, setDeleting] = useState(false);
  // State lags a render behind; a second tap on Save inside the same frame would read `false`.
  const busy = useRef(false);

  // Re-seed every time the sheet opens, or the target task changes under it.
  useEffect(() => {
    if (!visible) return;
    setValues(formValuesOf(task, initialDate));
    setErrors({});
    setStep('form');
  }, [visible, task, initialDate]);

  if (!visible) return null;

  /** The task is gone on the server: drop it here and close. */
  const goneAlready = (id: string) => {
    notify.info(t('CALENDAR_TASK_NOT_FOUND'));
    onDeleted(id);
    onClose();
  };

  const set = <K extends keyof CalendarTaskFormValues>(key: K, value: CalendarTaskFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    if (busy.current) return;
    const found = validateCalendarTaskForm(values, t);
    if (found.title || found.date || found.note) {
      setErrors(found);
      return;
    }
    busy.current = true;
    setSaving(true);
    const input = toCalendarTaskInput(values);
    const response = task ? await editCalendarTask(task.id, input, t) : await createCalendarTask(input, t);
    busy.current = false;
    setSaving(false);
    if (task && isCalendarTaskGone(response.error)) {
      goneAlready(task.id);
      return;
    }
    if (response.error || !response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    notify.success(t(isEdit ? 'CalendarTaskUpdated' : 'CalendarTaskCreated'));
    onSaved(response.success);
    onClose();
  };

  const confirmDelete = async () => {
    if (!task || busy.current) return;
    busy.current = true;
    setDeleting(true);
    const response = await deleteCalendarTask(task.id, t);
    busy.current = false;
    setDeleting(false);
    if (isCalendarTaskGone(response.error)) {
      goneAlready(task.id);
      return;
    }
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      setStep('form');
      return;
    }
    notify.success(t('CalendarTaskDeleted'));
    onDeleted(task.id);
    onClose();
  };

  if (step === 'delete' && task) {
    return (
      <DeleteModal
        visible
        deletePhrase={t('CalendarTaskDeleteConfirm')}
        name={task.title}
        pending={deleting}
        onCancel={() => setStep('form')}
        onConfirm={confirmDelete}
        testID="calendar-task-delete-modal"
      />
    );
  }

  return (
    <FormModal
      visible
      title={t(isEdit ? 'CalendarEditTask' : 'CalendarNewTask')}
      submitLabel={t('CalendarTaskSave')}
      submitting={saving}
      onClose={onClose}
      onSubmit={submit}
      testID="calendar-task-form"
    >
      <FormField label={t('CalendarTaskTitle')} required>
        <Input
          compact
          value={values.title}
          onChangeText={(text) => set('title', text)}
          maxLength={CALENDAR_TASK_TITLE_MAX}
          placeholder={t('CalendarTaskTitlePlaceholder')}
          error={errors.title}
          accessibilityLabel={t('CalendarTaskTitle')}
          testID="calendar-task-title"
        />
      </FormField>

      <DateField
        label={t('CalendarTaskDate')}
        required
        value={values.date}
        onChange={(date) => set('date', date)}
        error={errors.date}
        testID="calendar-task-date"
      />

      <View>
        {/* The label already says "(optional)", so no second marker. */}
        <FieldLabel>{t('CalendarTaskTime')}</FieldLabel>
        <View className="flex-row items-center gap-2">
          <TimeField value={values.time} onChange={(time) => set('time', time)} testID="calendar-task-time" />
          {values.time ? (
            <IconButton
              label={t('CalendarMobileClearTime')}
              onPress={() => set('time', '')}
              className="h-11 w-11"
              testID="calendar-task-time-clear"
            >
              <X size={16} color={theme.text3} />
            </IconButton>
          ) : null}
        </View>
      </View>

      <View>
        <FieldLabel>{t('CalendarTaskAdvance')}</FieldLabel>
        <View
          className="flex-row flex-wrap gap-1.5"
          accessibilityRole="radiogroup"
          accessibilityLabel={t('CalendarTaskAdvance')}
          testID="calendar-task-advance"
        >
          {CALENDAR_ADVANCE_PRESETS.map((minutes) => {
            const chosen = values.advanceMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                onPress={() => set('advanceMinutes', minutes)}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen, checked: chosen }}
                testID={`calendar-task-advance-${minutes}`}
                className={`min-h-11 justify-center rounded-full border px-3.5 ${
                  chosen ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                }`}
              >
                <Text className={`text-[12.5px] font-semibold ${chosen ? 'text-accent' : 'text-text-2'}`}>
                  {t(advanceLabelKey(minutes))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FormField label={t('CalendarTaskNote')}>
        <Input
          compact
          multiline
          value={values.note}
          onChangeText={(text) => set('note', text)}
          maxLength={CALENDAR_TASK_NOTE_MAX}
          error={errors.note}
          accessibilityLabel={t('CalendarTaskNote')}
          testID="calendar-task-note"
        />
      </FormField>

      {isEdit ? (
        <Button
          text={t('Delete')}
          mode="danger"
          size="block"
          icon={<Trash2 size={16} color={theme.danger} />}
          onPress={() => setStep('delete')}
          disabled={saving}
          testID="calendar-task-delete"
        />
      ) : null}
    </FormModal>
  );
}
