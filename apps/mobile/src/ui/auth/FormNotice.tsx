import { View, Text, ActivityIndicator } from 'react-native';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import { useBeyouTheme } from '../../theme/ThemeProvider';

type Tone = 'success' | 'error' | 'info' | 'loading';

interface FormNoticeProps {
  tone: Tone;
  title?: string;
  message: string;
  testID?: string;
}

/**
 * An auth form's answer — mirror of the web's `FormNotice`: the tone's icon, an
 * optional title and the message in two lines of 12.5px.
 *
 * Every native screen used to draw its own block: a double-bordered box on
 * register, a centred 48px icon on recovery, a loose paragraph on login. Same
 * notice, three shapes.
 */
export default function FormNotice({ tone, title, message, testID }: FormNoticeProps) {
  const { theme } = useBeyouTheme();

  const color =
    tone === 'success' ? theme.success : tone === 'error' ? theme.danger : theme.text3;
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleAlert : Info;
  const neutral = tone === 'info' || tone === 'loading';

  return (
    <View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex-row items-start gap-2.5 rounded-control border p-3 ${
        neutral ? 'border-border bg-surface-2' : ''
      }`}
      style={neutral ? undefined : { borderColor: withAlpha(color, 0.3), backgroundColor: withAlpha(color, 0.1) }}
      testID={testID}
    >
      <View className="mt-0.5 shrink-0">
        {tone === 'loading' ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Icon size={15} color={color} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        {title ? <Text className="text-[13px] font-semibold text-text">{title}</Text> : null}
        <Text className={`text-[12.5px] leading-snug text-text-2 ${title ? 'mt-0.5' : ''}`}>
          {message}
        </Text>
      </View>
    </View>
  );
}
