import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NotebookStatus } from '@beyou/types/notebook/notebook';
import { useBeyouTheme } from '../theme/ThemeProvider';

export const STATUS_LABEL_KEY: Record<NotebookStatus, string> = {
  TO_STUDY: 'NotebookStatusToStudy',
  STUDYING: 'NotebookStatusStudying',
  DONE: 'NotebookStatusDone',
};

/**
 * A page's status as a glyph, the same three shapes the web draws: a filled check when done, a
 * half-filled ring while studying, an empty ring before. Shape carries the meaning as well as the
 * colour, so the three still read apart for someone who cannot tell green from blue.
 */
export default function StatusMark({ status, size = 18 }: { status: NotebookStatus; size?: number }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t(STATUS_LABEL_KEY[status])}
      testID={`notebook-status-${status}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {status === 'DONE' ? (
          <>
            <Circle cx={12} cy={12} r={10} fill={theme.success} />
            <Path
              d="m8 12.5 2.7 2.7L16.5 9.5"
              fill="none"
              stroke={theme.onAccent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : status === 'STUDYING' ? (
          <>
            <Circle cx={12} cy={12} r={9} fill="none" stroke={theme.accent} strokeWidth={2.6} />
            <Path d="M12 3a9 9 0 0 1 0 18z" fill={theme.accent} />
          </>
        ) : (
          <Circle cx={12} cy={12} r={9} fill="none" stroke={theme.text3} strokeWidth={2.4} />
        )}
      </Svg>
    </View>
  );
}
