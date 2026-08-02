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
    // O wordmark vem do BrandMark e é literal (não passa por i18n).
    expect(getByText('beyou')).toBeTruthy();
  });

  it('renders tagline text', async () => {
    const { getByText } = await wrap(<MobileBrand />);
    // i18n key 'YourFavoriteHT' resolves to "Your favorite habit tracker"
    expect(getByText('Your favorite habit tracker')).toBeTruthy();
  });

  it('renders the brand mark with an accessibility label', async () => {
    const { getByLabelText } = await wrap(<MobileBrand />);
    expect(getByLabelText('beyou')).toBeTruthy();
  });
});
