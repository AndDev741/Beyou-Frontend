/**
 * RoutineStep (AI onboarding — Task 5) — chronological routine draft: remove
 * item, move-earlier swaps TIME SLOTS keeping durations, editable times via
 * TimeField, move-to-section through the BottomSheet, weekday pills and the
 * regenerate feedback loop (a new suggestion replaces local edits and clears
 * the feedback). Mirrors the web RoutineStep contract.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineStep from '../src/ui/aiOnboarding/RoutineStep';
import type { RoutineSuggestion } from '@beyou/types/onboarding/suggestions';

const suggestion: RoutineSuggestion = {
  name: 'Morning flow',
  iconId: 'lucide:sun',
  scheduleDays: ['Monday'],
  sections: [
    {
      name: 'Wake',
      iconId: 'lucide:sun',
      startTime: '07:00',
      endTime: '08:00',
      habits: [{ name: 'Run', startTime: '07:00', endTime: '07:30' }],
      tasks: [],
    },
    {
      name: 'Evening',
      iconId: 'lucide:moon',
      startTime: '19:00',
      endTime: '21:00',
      habits: [],
      tasks: [],
    },
  ],
};

interface Overrides {
  suggestion?: RoutineSuggestion;
  loading?: boolean;
  onRegenerate?: jest.Mock;
  onAccept?: jest.Mock;
}

const wrap = async (over: Overrides = {}) => {
  const props = {
    suggestion,
    loading: false,
    onRegenerate: jest.fn(),
    onAccept: jest.fn(),
    ...over,
  };
  const utils = await render(
    <BeyouThemeProvider>
      <RoutineStep {...props} />
    </BeyouThemeProvider>
  );
  return { props, utils };
};

const press = async (element: ReturnType<typeof screen.getByTestId>) => {
  await act(async () => {
    fireEvent.press(element);
  });
};

const accept = async () => {
  await press(screen.getByTestId('ai-onboarding-routine-accept'));
};

describe('AiOnboarding RoutineStep', () => {
  it('renders the routine name, sections and items chronologically', async () => {
    await wrap();
    expect(screen.getByText('Morning flow')).toBeTruthy();
    // "Wake" appears twice: the section header and the item's section-mover button.
    expect(screen.getAllByText('Wake').length).toBeGreaterThan(0);
    expect(screen.getByText('Evening')).toBeTruthy();
    expect(screen.getByText('Run')).toBeTruthy();
    expect(screen.getByText('Your daily routine draft')).toBeTruthy();
  });

  it('removing an item excludes it from the accepted draft', async () => {
    const { props } = await wrap();
    await press(screen.getAllByLabelText('Remove')[0]);
    await accept();
    expect(props.onAccept.mock.calls[0][0].sections[0].habits).toEqual([]);
  });

  it('move earlier swaps time slots with the previous item, keeping durations', async () => {
    const twoItems: RoutineSuggestion = {
      ...suggestion,
      sections: [
        {
          name: 'Wake',
          iconId: 'lucide:sun',
          startTime: '07:00',
          endTime: '09:00',
          habits: [{ name: 'Run', startTime: '07:00', endTime: '07:30' }],
          tasks: [{ name: 'Stretch', startTime: '07:30', endTime: '07:40' }],
        },
      ],
    };
    const { props } = await wrap({ suggestion: twoItems });

    // "Stretch" (07:30, second chronologically) moves earlier — it takes the
    // 07:00 start with its own 10min duration; "Run" follows with its 30min.
    await press(screen.getAllByLabelText('Move earlier')[1]);
    await accept();

    const accepted = props.onAccept.mock.calls[0][0];
    expect(accepted.sections[0].tasks[0]).toEqual({
      name: 'Stretch',
      startTime: '07:00',
      endTime: '07:10',
    });
    expect(accepted.sections[0].habits[0]).toEqual({
      name: 'Run',
      startTime: '07:10',
      endTime: '07:40',
    });
  });

  it("editing an item's start time via the TimeField lands in the accepted draft", async () => {
    const { props } = await wrap();

    await press(screen.getByTestId('ai-onboarding-start-habits-0-0'));
    const picked = new Date();
    picked.setHours(6, 45, 0, 0);
    await act(async () => {
      fireEvent(
        screen.getByTestId('ai-onboarding-start-habits-0-0-picker'),
        'onChange',
        { type: 'set' },
        picked
      );
    });
    await accept();

    expect(props.onAccept.mock.calls[0][0].sections[0].habits[0].startTime).toBe('06:45');
  });

  it('feedback triggers regenerate with the trimmed text', async () => {
    const { props } = await wrap();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-feedback'), '  I wake at 6  ');
    });
    await press(screen.getByTestId('ai-onboarding-regenerate'));
    expect(props.onRegenerate).toHaveBeenCalledWith('I wake at 6');
  });

  it('weekday toggle changes accepted days', async () => {
    const { props } = await wrap();
    await press(screen.getByLabelText('Tuesday'));
    await accept();
    expect(props.onAccept.mock.calls[0][1]).toEqual(['Monday', 'Tuesday']);
  });

  it('moving an item to another section keeps its times', async () => {
    const { props } = await wrap();
    await press(screen.getByTestId('ai-onboarding-move-section-habits-0-0'));
    await press(screen.getByTestId('ai-onboarding-section-option-1'));
    await accept();
    const edited = props.onAccept.mock.calls[0][0];
    expect(edited.sections[0].habits).toEqual([]);
    expect(edited.sections[1].habits).toEqual([
      { name: 'Run', startTime: '07:00', endTime: '07:30' },
    ]);
  });

  it('a regenerated suggestion replaces local edits and clears the feedback', async () => {
    const { props, utils } = await wrap();
    await press(screen.getAllByLabelText('Remove')[0]);
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('ai-onboarding-feedback'), 'more time');
    });

    const regenerated: RoutineSuggestion = {
      ...suggestion,
      name: 'Fresh flow',
      sections: [
        {
          name: 'Dawn',
          iconId: 'lucide:sun',
          startTime: '06:00',
          endTime: '07:00',
          habits: [{ name: 'Stretch', startTime: '06:00', endTime: '06:10' }],
          tasks: [],
        },
      ],
    };
    await act(async () => {
      utils.rerender(
        <BeyouThemeProvider>
          <RoutineStep
            suggestion={regenerated}
            loading={false}
            onRegenerate={props.onRegenerate}
            onAccept={props.onAccept}
          />
        </BeyouThemeProvider>
      );
    });

    expect(screen.getByTestId('ai-onboarding-feedback').props.value).toBe('');
    await accept();
    expect(props.onAccept.mock.calls[0][0].name).toBe('Fresh flow');
    expect(props.onAccept.mock.calls[0][0].sections[0].habits).toEqual([
      { name: 'Stretch', startTime: '06:00', endTime: '06:10' },
    ]);
  });
});
