/**
 * The calendar task sheet (R1–R3): title of 2 to 255 characters and a date are required, time
 * and note are optional and go out as null when empty, Save cannot fire twice, and delete asks
 * first. Plus the validator on its own, for the limits a phone keyboard never reaches.
 *
 * Boundary mocked: the calendar API module and notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@beyou/api/calendar/calendarApi', () => ({
  createCalendarTask: jest.fn(),
  editCalendarTask: jest.fn(),
  deleteCalendarTask: jest.fn(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import {
  createCalendarTask,
  deleteCalendarTask,
  editCalendarTask,
} from '@beyou/api/calendar/calendarApi';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import i18n from '../src/i18n';
import { notify } from '../src/notify';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CalendarTaskSheet from '../src/calendar/CalendarTaskSheet';
import { validateCalendarTaskForm } from '../src/calendar/calendarTaskForm';

const mockedCreate = createCalendarTask as jest.Mock;
const mockedEdit = editCalendarTask as jest.Mock;
const mockedDelete = deleteCalendarTask as jest.Mock;

const existing: CalendarTask = {
  id: 't1',
  title: 'Sign the lease',
  note: 'Bring the ID',
  date: '2026-10-14',
  time: '10:00',
  advanceMinutes: 60,
  completed: false,
  completedAt: null,
  xpAwarded: 0,
  notifyAt: '2026-10-14T12:00:00Z',
};

const handlers = () => ({ onClose: jest.fn(), onSaved: jest.fn(), onDeleted: jest.fn() });

async function renderSheet(props: Partial<Parameters<typeof CalendarTaskSheet>[0]> = {}) {
  const callbacks = handlers();
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <CalendarTaskSheet visible task={null} {...callbacks} {...props} />
      </BeyouThemeProvider>,
    );
  });
  return callbacks;
}

async function type(testID: string, text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

async function pickTime(hours: number, minutes: number) {
  await press('calendar-task-time');
  const picked = new Date();
  picked.setHours(hours, minutes, 0, 0);
  await act(async () => {
    fireEvent(screen.getByTestId('calendar-task-time-picker'), 'onChange', { type: 'set' }, picked);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
});

describe('CalendarTaskSheet, validation', () => {
  it('refuses a one-letter title and sends nothing', async () => {
    await renderSheet({ initialDate: '2026-10-14' });

    await type('calendar-task-title', ' a ');
    await press('calendar-task-form-submit');

    expect(screen.getByTestId('calendar-task-title-error').props.children).toBe(i18n.t('CalendarTitleTooShort'));
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('requires a date before it sends anything', async () => {
    await renderSheet();

    await type('calendar-task-title', 'Book the dentist');
    await press('calendar-task-form-submit');

    expect(screen.getByText(i18n.t('CalendarDateRequired'))).toBeTruthy();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('takes the date from the picker once one is chosen', async () => {
    mockedCreate.mockResolvedValue({ success: { ...existing, id: 'new' } });
    await renderSheet();

    await type('calendar-task-title', 'Book the dentist');
    await press('calendar-task-date');
    await act(async () => {
      fireEvent(
        screen.getByTestId('calendar-task-date-picker'),
        'onChange',
        { type: 'set' },
        new Date(2026, 9, 21, 12, 0, 0),
      );
    });
    await press('calendar-task-form-submit');

    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-21' }), expect.anything());
  });

  it('holds the API limits: 2 to 255 for the title, 1000 for the note', () => {
    const t = i18n.t.bind(i18n);
    const base = { date: '2026-10-14', time: '', advanceMinutes: 0, note: '' };
    expect(validateCalendarTaskForm({ ...base, title: 'ab' }, t)).toEqual({});
    expect(validateCalendarTaskForm({ ...base, title: 'x'.repeat(255) }, t)).toEqual({});
    expect(validateCalendarTaskForm({ ...base, title: 'x'.repeat(256) }, t).title).toBeTruthy();
    expect(validateCalendarTaskForm({ ...base, title: 'a' }, t).title).toBeTruthy();
    expect(validateCalendarTaskForm({ ...base, title: 'ok', note: 'n'.repeat(1001) }, t).note).toBeTruthy();
    expect(validateCalendarTaskForm({ ...base, title: 'ok', date: '2026-02-31' }, t).date).toBeTruthy();
  });
});

describe('CalendarTaskSheet, saving', () => {
  it('sends the trimmed title, the advance, and null for an empty time and note', async () => {
    mockedCreate.mockResolvedValue({ success: { ...existing, id: 'new' } });
    const { onSaved, onClose } = await renderSheet({ initialDate: '2026-10-14' });

    await type('calendar-task-title', '  Sign the lease  ');
    await press('calendar-task-advance-60');
    await press('calendar-task-form-submit');

    expect(mockedCreate).toHaveBeenCalledWith(
      { title: 'Sign the lease', date: '2026-10-14', time: null, advanceMinutes: 60, note: null },
      expect.anything(),
    );
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' }));
    expect(onClose).toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith(i18n.t('CalendarTaskCreated'));
  });

  it('sends the picked time, and null again once it is cleared', async () => {
    mockedCreate.mockResolvedValue({ success: { ...existing, id: 'new' } });
    await renderSheet({ initialDate: '2026-10-14' });
    await type('calendar-task-title', 'Call the bank');

    await pickTime(15, 30);
    expect(screen.getByText('15:30')).toBeTruthy();
    await press('calendar-task-time-clear');
    await press('calendar-task-form-submit');
    expect(mockedCreate).toHaveBeenLastCalledWith(expect.objectContaining({ time: null }), expect.anything());
  });

  it('keeps a picked time', async () => {
    mockedCreate.mockResolvedValue({ success: { ...existing, id: 'new' } });
    await renderSheet({ initialDate: '2026-10-14' });
    await type('calendar-task-title', 'Call the bank');

    await pickTime(15, 30);
    await press('calendar-task-form-submit');

    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ time: '15:30' }), expect.anything());
  });

  it('cannot be saved twice while the first request is still out', async () => {
    let resolve: (value: unknown) => void = () => {};
    mockedCreate.mockReturnValue(new Promise((r) => { resolve = r; }));
    await renderSheet({ initialDate: '2026-10-14' });
    await type('calendar-task-title', 'Sign the lease');

    await press('calendar-task-form-submit');
    expect(screen.getByTestId('calendar-task-form-submit').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await press('calendar-task-form-submit');
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve({ success: { ...existing, id: 'new' } });
    });
  });

  it('edits the task it was opened with and keeps its fields', async () => {
    mockedEdit.mockResolvedValue({ success: { ...existing, title: 'Sign the new lease' } });
    await renderSheet({ task: existing });

    expect(screen.getByTestId('calendar-task-title').props.value).toBe('Sign the lease');
    await type('calendar-task-title', 'Sign the new lease');
    await press('calendar-task-form-submit');

    expect(mockedEdit).toHaveBeenCalledWith(
      't1',
      { title: 'Sign the new lease', date: '2026-10-14', time: '10:00', advanceMinutes: 60, note: 'Bring the ID' },
      expect.anything(),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('says what went wrong and stays open when the server refuses', async () => {
    mockedCreate.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
    const { onClose, onSaved } = await renderSheet({ initialDate: '2026-10-14' });
    await type('calendar-task-title', 'Sign the lease');

    await press('calendar-task-form-submit');

    expect(notify.error).toHaveBeenCalledWith(i18n.t('UnexpectedError'));
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  /**
   * Deleted on another device while this sheet was open. Keeping the form up with an error would
   * leave the person editing something that is gone; it closes, the task leaves the day, and a
   * short toast says why.
   */
  it('closes and drops the task when an edit finds it gone', async () => {
    mockedEdit.mockResolvedValue({ error: { errorKey: 'CALENDAR_TASK_NOT_FOUND' } });
    const { onDeleted, onClose, onSaved } = await renderSheet({ task: existing });

    await press('calendar-task-form-submit');

    expect(onDeleted).toHaveBeenCalledWith('t1');
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(notify.info).toHaveBeenCalledWith(i18n.t('CALENDAR_TASK_NOT_FOUND'));
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe('CalendarTaskSheet, deleting', () => {
  it('asks first, and a cancel brings the form back untouched', async () => {
    await renderSheet({ task: existing });
    await type('calendar-task-title', 'Changed my mind');

    await press('calendar-task-delete');
    expect(screen.getByTestId('calendar-task-delete-modal')).toBeTruthy();
    expect(mockedDelete).not.toHaveBeenCalled();

    await press('calendar-task-delete-modal-cancel');
    expect(screen.queryByTestId('calendar-task-delete-modal')).toBeNull();
    expect(screen.getByTestId('calendar-task-title').props.value).toBe('Changed my mind');
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('deletes once confirmed', async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const { onDeleted, onClose } = await renderSheet({ task: existing });

    await press('calendar-task-delete');
    await press('calendar-task-delete-modal-confirm');

    expect(mockedDelete).toHaveBeenCalledWith('t1', expect.anything());
    expect(onDeleted).toHaveBeenCalledWith('t1');
    expect(onClose).toHaveBeenCalled();
  });

  it('counts a delete of a task already gone as done', async () => {
    mockedDelete.mockResolvedValue({ error: { errorKey: 'CALENDAR_TASK_NOT_FOUND' } });
    const { onDeleted, onClose } = await renderSheet({ task: existing });

    await press('calendar-task-delete');
    await press('calendar-task-delete-modal-confirm');

    expect(onDeleted).toHaveBeenCalledWith('t1');
    expect(onClose).toHaveBeenCalled();
    expect(notify.info).toHaveBeenCalledWith(i18n.t('CALENDAR_TASK_NOT_FOUND'));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('offers no delete on a task that does not exist yet', async () => {
    await renderSheet({ initialDate: '2026-10-14' });
    expect(screen.queryByTestId('calendar-task-delete')).toBeNull();
  });
});
