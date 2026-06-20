/**
 * BeyouIcon — renders saved icon ids via @beyou/icons. lucide-react-native is
 * mocked (jest.setup) to no-op components, so the lucide branch renders null in
 * tests (real device renders the icon); emoji + fallback are asserted directly.
 */
import { render, screen } from '@testing-library/react-native';
import BeyouIcon from '../src/ui/BeyouIcon';

describe('BeyouIcon', () => {
  it('renders the emoji char for emoji ids', async () => {
    await render(<BeyouIcon id="emoji:fire" />);
    expect(screen.getByText('🔥')).toBeTruthy();
  });

  it('renders nothing for unresolvable ids (legacy react-icons / empty)', async () => {
    const r = await render(<BeyouIcon id="ri:md/MdHome" />);
    expect(r.toJSON()).toBeNull();
    const empty = await render(<BeyouIcon id="" />);
    expect(empty.toJSON()).toBeNull();
  });

  it('renders a lucide icon without crashing', async () => {
    const r = await render(<BeyouIcon id="lucide:house" />);
    // lucide-react-native is mocked to a no-op here; on device it renders the SVG.
    expect(r.toJSON()).toBeNull();
  });
});
