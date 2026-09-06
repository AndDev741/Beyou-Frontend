import { act, render } from '@testing-library/react-native';
import i18n from '../src/i18n';
import FieldLabel from '../src/ui/form/FieldLabel';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';

async function mount(ui: React.ReactElement) {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);
  });
  return utils;
}

describe('FieldLabel', () => {
  it('required draws the asterisk as a sibling, so the bare label is still findable', async () => {
    const { getByText, getByTestId } = await mount(
      <FieldLabel required testID="name">
        Name
      </FieldLabel>,
    );
    expect(getByText('Name')).toBeTruthy();
    // The asterisk is hidden from assistive tech, so RNTL skips it by default.
    expect(getByTestId('name-required', { includeHiddenElements: true })).toHaveTextContent('*');
  });

  it('optional writes the translated "optional" after the label', async () => {
    const { getByText, getByTestId, queryByTestId } = await mount(
      <FieldLabel optional testID="phrase">
        Phrase
      </FieldLabel>,
    );
    expect(getByText('Phrase')).toBeTruthy();
    expect(queryByTestId('phrase-required')).toBeNull();
    expect(getByTestId('phrase-optional')).toHaveTextContent(`· ${i18n.t('FieldOptional')}`);
  });

  it('no flag draws neither marker', async () => {
    const { getByText, queryByTestId, queryByText } = await mount(<FieldLabel testID="email">Email</FieldLabel>);
    expect(getByText('Email')).toBeTruthy();
    expect(queryByTestId('email-required', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('email-optional')).toBeNull();
    expect(queryByText('*', { includeHiddenElements: true })).toBeNull();
  });
});
