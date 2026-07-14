import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react-native';
import type { agentSegment } from '@beyou/types/agent/chatType';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import AgentMarkdown from './AgentMarkdown';

type OnInternalLink = (href: string) => void;

/** A tool the agent used, shown as a labeled row (spinner -> check/x). */
function ToolRow({ segment }: { segment: agentSegment }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const label = t(`AgentTool.${segment.tool}`, segment.tool ?? '');
  const failed = !!segment.error;
  const running = segment.status === 'started';

  return (
    <View
      className={`flex-row items-center gap-2 self-start rounded-lg border px-2.5 py-1.5 ${
        failed ? 'border-error/30 bg-error/10' : 'border-primary/20 bg-primary/5'
      }`}
    >
      {running ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : failed ? (
        <X size={14} color={theme.error} />
      ) : (
        <Check size={14} color={theme.primary} />
      )}
      <Text className={`text-sm font-medium ${failed ? 'text-error' : 'text-secondary'}`}>
        {label}
        {failed ? ` · ${t('AgentToolFailed')}` : ''}
      </Text>
    </View>
  );
}

/**
 * Renders an assistant turn as its ordered segments — text as markdown, tools
 * as labeled rows, interleaved as they happened. Live streaming and persisted.
 */
export default function AgentSegments({
  segments,
  onInternalLink,
}: {
  segments: agentSegment[];
  onInternalLink?: OnInternalLink;
}) {
  return (
    <View className="gap-2">
      {segments.map((segment, index) =>
        segment.type === 'tool' ? (
          <ToolRow key={index} segment={segment} />
        ) : (
          <AgentMarkdown key={index} text={segment.text ?? ''} onInternalLink={onInternalLink} />
        ),
      )}
    </View>
  );
}
