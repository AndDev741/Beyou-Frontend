import React from 'react';
import { render } from '@testing-library/react-native';
import MobileBrand from './MobileBrand';
import { BeyouThemeProvider } from '../theme/ThemeProvider';
import '../i18n';

const wrap = async (ui: React.ReactElement) =>
  render(<BeyouThemeProvider>{ui}</BeyouThemeProvider>);

describe('MobileBrand', () => {
  it('renders the mobile-brand container', async () => {
    const { getByTestId } = await wrap(<MobileBrand />);
    expect(getByTestId('mobile-brand')).toBeTruthy();
  });

  it('renders BeYou brand name', async () => {
    const { getByText } = await wrap(<MobileBrand />);
    // i18n key 'BeYou' resolves to "Be you"
    expect(getByText('Be you')).toBeTruthy();
  });

  it('renders tagline text', async () => {
    const { getByText } = await wrap(<MobileBrand />);
    // i18n key 'YourFavoriteHT' resolves to "Your favorite habit tracker"
    expect(getByText('Your favorite habit tracker')).toBeTruthy();
  });

  it('renders Logo image with accessibility label', async () => {
    const { getByLabelText } = await wrap(<MobileBrand />);
    expect(getByLabelText('BeYou — habit tracker logo')).toBeTruthy();
  });
});
