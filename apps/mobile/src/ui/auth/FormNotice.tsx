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
 * A resposta de um formulário de autenticação — espelho do `FormNotice` da web:
 * ícone do tom, título opcional e a mensagem em duas linhas de 12,5px.
 *
 * Antes cada tela nativa desenhava seu próprio bloco: uma caixa de borda dupla
 * no registro, um ícone de 48px centralizado na recuperação, um parágrafo solto
 * no login. Mesmo aviso, três formas.
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
