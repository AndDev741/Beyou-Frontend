import { describe, expect, it, vi } from 'vitest';
import { announceCalendarChange, onCalendarChange } from './calendarChanges';

describe('calendar change announcements', () => {
  it('reaches every screen listening, and none that stopped', () => {
    const page = vi.fn();
    const widget = vi.fn();
    const stopPage = onCalendarChange(page);
    const stopWidget = onCalendarChange(widget);

    announceCalendarChange();
    stopPage();
    announceCalendarChange();
    stopWidget();

    expect(page).toHaveBeenCalledTimes(1);
    expect(widget).toHaveBeenCalledTimes(2);
  });

  it('keeps going when one listener throws', () => {
    const broken = vi.fn(() => {
      throw new Error('fetch failed');
    });
    const fine = vi.fn();
    const stops = [onCalendarChange(broken), onCalendarChange(fine)];

    expect(() => announceCalendarChange()).not.toThrow();
    expect(fine).toHaveBeenCalledTimes(1);
    for (const stop of stops) stop();
  });
});
