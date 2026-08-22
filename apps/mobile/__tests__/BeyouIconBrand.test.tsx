/**
 * The brand marks (github, figma, slack…) exist in lucide-react on web but were
 * dropped from lucide 1.x for trademark reasons, so `lucide-react-native` exports no
 * component for them and they rendered as an empty tile on mobile. BeyouIcon falls
 * back to lucide's generic `Icon` fed with committed path data.
 *
 * The global mock in jest.setup is a Proxy that answers EVERY name, so the fallback
 * branch is unreachable under it. This file replaces it with a mock shaped like the
 * real package: the brand names missing, `Icon` present.
 *
 * The mock records onto `globalThis` rather than a module variable: jest hoists
 * `jest.mock` above the imports, so a module-scope array would still be in its
 * temporal dead zone when the factory runs. Nothing is rendered inside the factory
 * either — the NativeWind babel transform rewrites JSX there into an out-of-scope
 * reference that jest rejects outright.
 */
import { render } from '@testing-library/react-native';

declare global {
  // eslint-disable-next-line no-var
  var __brandIconNodes: unknown[][];
}

jest.mock('lucide-react-native', () => {
  const MISSING = new Set(['Github', 'Figma', 'Slack', 'Youtube']);
  const target: Record<string, unknown> = {
    __esModule: true,
    Icon: ({ iconNode }: { iconNode: unknown[] }) => {
      globalThis.__brandIconNodes.push(iconNode);
      return null;
    },
    Circle: () => null,
  };
  return new Proxy(target, {
    get: (t, prop: string) => {
      if (prop in t) return t[prop];
      if (MISSING.has(prop)) return undefined;
      return () => null;
    },
  });
});

// eslint-disable-next-line import/first
import BeyouIcon from '../src/ui/BeyouIcon';

beforeEach(() => {
  globalThis.__brandIconNodes = [];
});

describe('BeyouIcon — brand marks the native package lacks', () => {
  it('draws github from the committed path data', async () => {
    await render(<BeyouIcon id="lucide:github" />);
    expect(globalThis.__brandIconNodes).toHaveLength(1);
    // lucide's github icon is two <path> elements.
    expect(globalThis.__brandIconNodes[0]).toHaveLength(2);
    expect(globalThis.__brandIconNodes[0][0]).toEqual([
      'path',
      expect.objectContaining({ d: expect.any(String) }),
    ]);
  });

  it('does the same for the other dropped marks', async () => {
    const drawn: string[] = [];
    for (const id of ['lucide:figma', 'lucide:slack', 'lucide:youtube']) {
      globalThis.__brandIconNodes = [];
      await render(<BeyouIcon id={id} />);
      if (globalThis.__brandIconNodes.length === 1) drawn.push(id);
    }
    expect(drawn).toEqual(['lucide:figma', 'lucide:slack', 'lucide:youtube']);
  });

  it('does not reach for path data when the package exports the icon', async () => {
    await render(<BeyouIcon id="lucide:house" />);
    expect(globalThis.__brandIconNodes).toHaveLength(0);
  });

  it('renders nothing for a name that is genuinely unknown', async () => {
    const r = await render(<BeyouIcon id="lucide:not-a-real-icon-name" />);
    expect(r.toJSON()).toBeNull();
    expect(globalThis.__brandIconNodes).toHaveLength(0);
  });
});
