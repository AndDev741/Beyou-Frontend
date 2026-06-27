/**
 * SnapshotCard (Task 6) — renders structure sections + items; resolves each
 * item's check by originalGroupId; fires onCheck/onSkip with the check id;
 * shows a day summary (completed/skipped/XP).
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SnapshotCard from '../src/ui/routines/SnapshotCard';

const snapshot = {
  id: 'sn1', snapshotDate: '2026-06-10', routineName: 'Morning', routineIconId: '', completed: false,
  structure: { sections: [{ name: 'Wake', iconId: '', orderIndex: 0, startTime: '06:00', endTime: '07:00',
    items: [{ type: 'HABIT', groupId: 'g1', itemId: 'h1', name: 'Meditate', iconId: 'lucide:brain', startTime: '06:10', endTime: null }] }] },
  checks: [{ id: 'chk1', itemType: 'HABIT', itemName: 'Meditate', itemIconId: 'lucide:brain', sectionName: 'Wake', originalGroupId: 'g1', difficulty: 1, importance: 1, checked: false, skipped: false, checkTime: null, xpGenerated: 0 }],
} as never;
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('renders items (with their time) and fires check by check id', async () => {
  const onCheck = jest.fn();
  await wrap(<SnapshotCard snapshot={snapshot} onCheck={onCheck} onSkip={jest.fn()} />);
  expect(screen.getByText('Meditate')).toBeTruthy();
  expect(screen.getByText('06:10')).toBeTruthy(); // item start time is shown
  await act(async () => { fireEvent.press(screen.getByTestId('snap-check-chk1')); });
  expect(onCheck).toHaveBeenCalledWith('chk1');
});

test('orders items within a section by start time', async () => {
  const twoItems = {
    id: 'sn2', snapshotDate: '2026-06-10', routineName: 'Morning', routineIconId: '', completed: false,
    structure: { sections: [{ name: 'Wake', iconId: '', orderIndex: 0, startTime: '06:00', endTime: '07:00', items: [
      { type: 'HABIT', groupId: 'g2', itemId: 'h2', name: 'zzz-late', iconId: '', startTime: '06:30', endTime: null },
      { type: 'HABIT', groupId: 'g1', itemId: 'h1', name: 'aaa-early', iconId: '', startTime: '06:05', endTime: null },
    ] }] },
    checks: [],
  } as never;
  await wrap(<SnapshotCard snapshot={twoItems} onCheck={jest.fn()} onSkip={jest.fn()} />);
  const names = screen.getAllByText(/-(early|late)/).map((n) => n.props.children);
  expect(names).toEqual(['aaa-early', 'zzz-late']); // 06:05 before 06:30
});
