/**
 * A notebook diagram on the phone. The layout is shared (@beyou/state) and tested there; what is
 * the phone's own is mapping the scene to react-native-svg elements, the "could not draw" box for
 * a spec that does not parse, the page reader's card that opens full screen, and the drawing the
 * editor's web view shows (an SVG string, since that side is a DOM).
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { buildTheme } from '@beyou/theme';
import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DiagramNative from '../src/notebook/diagram/DiagramNative';
import BlockRenderer from '../src/notebook/BlockRenderer';
import { diagramMarkup } from '../src/notebook/editor/diagramMarkup';

const flow: DiagramSpec = {
  v: 1,
  kind: 'FLOW',
  title: 'Transaction lifecycle',
  nodes: [
    { id: 'a', label: 'Active', detail: 'reading and writing', tone: 'ACCENT' },
    { id: 'b', label: 'Committed', detail: null, tone: 'SUCCESS' },
    { id: 'c', label: 'Failed', detail: null, tone: 'DANGER' },
  ],
  links: [
    { from: 'a', to: 'b', label: 'commit', dashed: false },
    { from: 'a', to: 'c', label: 'error', dashed: true },
  ],
};

const timeline: DiagramSpec = {
  v: 1,
  kind: 'TIMELINE',
  title: '',
  nodes: [
    { id: 'n1', label: 'ARPANET', detail: '1969', tone: 'NEUTRAL' },
    { id: 'n2', label: 'TCP/IP', detail: '1983', tone: 'ACCENT' },
  ],
  links: [],
};

async function mount(node: React.ReactElement) {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
}

/**
 * The host elements react-native-svg rendered, by native name (RNSVGRect, RNSVGPath, ...). RNTL
 * 14 has no type queries, and the svg elements are not RN Text, so text queries do not see them.
 */
type HostNode = { type: string; props: Record<string, any>; children: (HostNode | string)[] | null };
function hosts(type: string): HostNode[] {
  const found: HostNode[] = [];
  const walk = (node: HostNode | HostNode[] | string | null) => {
    if (!node || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === type) found.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as HostNode | HostNode[] | null);
  return found;
}
/** The words drawn, from each text's span. */
const svgTexts = () => hosts('RNSVGTSpan').map((span) => String(span.props.content));

describe('DiagramNative', () => {
  it('draws a box, an arrow and the labels for every node and link', async () => {
    await mount(<DiagramNative spec={flow} width={360} />);

    const svg = screen.getByTestId('diagram');
    expect(svg.props.accessibilityRole).toBe('image');
    // The outline a screen reader hears, from the shared diagramText.
    expect(svg.props.accessibilityLabel).toContain('Active → Committed: commit');

    // Three node boxes and two label pills at least, every one of them painted.
    const rects = hosts('RNSVGRect');
    expect(rects.length).toBeGreaterThanOrEqual(5);
    expect(rects.every((rect) => rect.props.fill != null)).toBe(true);
    // Edges are stroked lines, the dashed one dashed; arrowheads are filled paths.
    const paths = hosts('RNSVGPath');
    expect(paths.some((path) => path.props.strokeDasharray?.length === 2)).toBe(true);
    expect(paths.some((path) => path.props.fill != null && path.props.stroke == null)).toBe(true);

    const texts = svgTexts();
    for (const label of ['Active', 'Committed', 'Failed', 'commit', 'error']) expect(texts).toContain(label);
    // The weight rides on the family: Geist is loaded one file per weight.
    const families = hosts('RNSVGText').map((text) => text.props.font?.fontFamily);
    expect(families).toContain('GeistSemiBold');
    expect(families).not.toContain(undefined);
  });

  it('fits a wide scene into the width it is given and keeps the aspect', async () => {
    await mount(<DiagramNative spec={flow} width={200} />);

    const svg = screen.getByTestId('diagram');
    expect(svg.props.width).toBeLessThanOrEqual(200);
    // The viewBox stays the scene's, the drawn box is that scaled: same aspect.
    expect(svg.props.vbWidth).toBeGreaterThan(svg.props.width);
    expect(svg.props.height).toBeCloseTo((svg.props.vbHeight * svg.props.width) / svg.props.vbWidth, -1);
  });

  it('draws a timeline with its dots', async () => {
    await mount(<DiagramNative spec={timeline} width={360} />);

    expect(hosts('RNSVGCircle').length).toBeGreaterThanOrEqual(2);
    expect(svgTexts()).toEqual(expect.arrayContaining(['ARPANET', '1983']));
  });

  it('shows the could-not-draw box for a spec that does not parse', async () => {
    await mount(<DiagramNative spec={null} width={360} />);

    expect(screen.getByTestId('diagram-invalid')).toBeTruthy();
    expect(screen.getByText("This diagram couldn't be drawn.")).toBeTruthy();
    expect(screen.queryByTestId('diagram')).toBeNull();
  });
});

describe('BlockRenderer diagram block', () => {
  const page = (spec: string) =>
    JSON.stringify([
      { type: 'paragraph', content: [{ type: 'text', text: 'Before the diagram.', styles: {} }] },
      { id: 'd1', type: 'diagram', props: { spec }, children: [] },
    ]);

  it('draws the block as a card that opens full screen', async () => {
    await mount(<BlockRenderer content={page(JSON.stringify(flow))} />);

    const card = screen.getByTestId('notebook-block-diagram');
    expect(card.props.accessibilityLabel).toBe('Open the diagram Transaction lifecycle in full screen');
    expect(screen.getByText('Transaction lifecycle')).toBeTruthy();
    expect(screen.getByText('Tap to zoom')).toBeTruthy();
    expect(screen.getByTestId('notebook-block-diagram-art')).toBeTruthy();
    expect(screen.queryByTestId('diagram-fullscreen')).toBeNull();

    await act(async () => {
      fireEvent.press(card);
    });
    expect(screen.getByTestId('diagram-fullscreen')).toBeTruthy();
    expect(screen.getByTestId('diagram-fullscreen-art')).toBeTruthy();
    expect(screen.getByText('Flow · 3 items')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Close full screen'));
    });
    expect(screen.queryByTestId('diagram-fullscreen')).toBeNull();
  });

  it('keeps a block whose spec does not draw on the page, as the could-not-draw box', async () => {
    await mount(<BlockRenderer content={page('{"nodes":[{"label":"only one"}]}')} />);

    expect(screen.getByText('Before the diagram.')).toBeTruthy();
    expect(screen.getByTestId('notebook-block-diagram-invalid')).toBeTruthy();
  });

  it('counts a page holding only a diagram as a page with notes', async () => {
    await mount(<BlockRenderer content={JSON.stringify([{ type: 'diagram', props: { spec: JSON.stringify(timeline) } }])} />);

    expect(screen.queryByTestId('notebook-blocks-empty')).toBeNull();
    // An untitled diagram still has a name on its card.
    expect(screen.getByText('Diagram')).toBeTruthy();
  });
});

describe('diagramMarkup (the editor web view drawing)', () => {
  const tokens = buildTheme({ mode: 'light', accentPack: 'beyou' });

  it('draws a block prop as an SVG with its title', () => {
    const drawing = diagramMarkup(JSON.stringify(flow), tokens, 320);

    expect(drawing?.title).toBe('Transaction lifecycle');
    expect(drawing?.svg.startsWith('<svg')).toBe(true);
    expect(drawing?.svg).toContain('>Committed</text>');
  });

  it('escapes what a label carries, so a block cannot inject markup', () => {
    const hostile = { ...flow, nodes: [{ ...flow.nodes[0], label: '<img src=x onerror=alert(1)>' }, ...flow.nodes.slice(1)] };
    const drawing = diagramMarkup(JSON.stringify(hostile), tokens, 320);

    expect(drawing?.svg).not.toContain('<img');
    expect(drawing?.svg).toContain('&lt;img');
  });

  it('answers null for a prop that does not draw', () => {
    expect(diagramMarkup('', tokens, 320)).toBeNull();
    expect(diagramMarkup('not json', tokens, 320)).toBeNull();
    expect(diagramMarkup(JSON.stringify({ nodes: [{ label: 'one' }] }), tokens, 320)).toBeNull();
  });
});
