import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import {
  diagramColors,
  diagramText,
  layoutDiagram,
  shapePaint,
  textColor,
  type DiagramColors,
  type SceneShape,
  type SceneText,
} from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useMeasuredWidth } from '../../ui/useMeasuredWidth';

type Props = {
  /** A clean spec (the server's, or `parseDiagramProp`'s). Null draws the "could not draw" box. */
  spec: DiagramSpec | null;
  /** The width the diagram is laid out for and fitted into. Measured from the container when left out. */
  width?: number;
  /**
   * True (the default): scaled down to fit `width`, never up, so the text keeps the size the layout
   * measured it at. False: drawn at the scene's own size, for a view that scrolls.
   */
  fit?: boolean;
  /** Caps the drawn height as well, for a small preview. */
  maxHeight?: number;
  testID?: string;
};

/**
 * A diagram drawn with react-native-svg from the shared scene (`layoutDiagram` in @beyou/state).
 * The layout, the line breaks and the colors are all decided there, the same as on the web; this
 * file only maps each placed shape to an element.
 *
 * The layout runs for the width it is given, so a phone gets the narrow forms (a flow that goes
 * down, a map as an outline). A scene that still comes out wider is scaled down to fit.
 */
export default function DiagramNative({ spec, width, fit = true, maxHeight, testID = 'diagram' }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  // The page and the chat give the card the screen's width less their paddings; the guess only
  // covers the first frame, before onLayout reports the real number.
  const measured = useMeasuredWidth((windowWidth) => windowWidth - 64);
  const available = Math.max(1, Math.floor(width ?? measured.width));

  const colors = useMemo(() => diagramColors(theme), [theme]);
  const scene = useMemo(() => (spec ? layoutDiagram(spec, { maxWidth: available }) : null), [spec, available]);
  const label = useMemo(() => (spec ? diagramText(spec) : ''), [spec]);

  if (!spec || !scene) {
    return (
      <View
        className="items-center justify-center rounded-control border border-dashed border-border px-4 py-6"
        testID={`${testID}-invalid`}
      >
        <Text className="text-center text-[13px] leading-5 text-text-2">{t('DiagramInvalid')}</Text>
      </View>
    );
  }

  let scale = fit ? Math.min(1, available / scene.width) : 1;
  if (maxHeight) scale = Math.min(scale, maxHeight / scene.height);
  const drawnWidth = Math.round(scene.width * scale);
  const drawnHeight = Math.round(scene.height * scale);

  return (
    <View
      className="items-center"
      onLayout={width === undefined ? measured.onLayout : undefined}
      testID={`${testID}-frame`}
    >
      <Svg
        width={drawnWidth}
        height={drawnHeight}
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        testID={testID}
      >
        {scene.shapes.map((shape, index) => (
          <Shape key={index} shape={shape} colors={colors} />
        ))}
        {scene.texts.map((text, index) => (
          <SvgText
            key={index}
            x={text.x}
            y={text.y}
            fontSize={text.size}
            fontFamily={fontFamily(text)}
            textAnchor={text.anchor}
            fill={textColor(text, colors)}
          >
            {text.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function Shape({ shape, colors }: { shape: SceneShape; colors: DiagramColors }) {
  const paint = shapePaint(shape, colors);
  const stroke = paint.stroke === 'none' ? undefined : paint.stroke;
  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          rx={shape.r}
          fill={paint.fill}
          stroke={stroke}
          strokeWidth={stroke ? paint.strokeWidth : undefined}
        />
      );
    case 'pill':
      // sceneToSvg's radius for an edge label's ground, so both renderers draw the same pill.
      return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={9} fill={paint.fill} />;
    case 'dot':
      return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={paint.fill} stroke={stroke} strokeWidth={paint.strokeWidth} />;
    case 'head':
      return <Path d={shape.d} fill={paint.fill} />;
    case 'path':
      return (
        <Path
          d={shape.d}
          fill="none"
          stroke={stroke}
          strokeWidth={paint.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={shape.dashed ? '5 5' : undefined}
        />
      );
  }
}

/**
 * The app loads each Geist weight as a family of its own (app/_layout.tsx), so the weight picks
 * the family. A `fontWeight` of 600 on top would not help: react-native-svg on Android asks the
 * font manager for a BOLD style of the family, finds none registered and falls back to the
 * system font, and the layout measured every line in Geist.
 */
function fontFamily(text: SceneText): string {
  if (text.mono) return text.weight >= 600 ? 'GeistMonoSemiBold' : 'GeistMono';
  if (text.weight >= 600) return 'GeistSemiBold';
  if (text.weight >= 500) return 'GeistMedium';
  return 'Geist';
}
