import { Pressable, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface GhostAddProps {
  label: string;
  onPress: () => void;
  className?: string;
  testID?: string;
}

/** Convite discreto para adicionar dentro de uma lista (seção, item, categoria). */
export default function GhostAdd({ label, onPress, className = '', testID }: GhostAddProps) {
  const { theme } = useBeyouTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className={`w-full flex-row items-center justify-center gap-2 rounded-control border border-dashed border-border py-2.5 active:opacity-70 ${className}`}
    >
      <Plus size={16} color={theme.text2} />
      <Text className="text-text-2 text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}
