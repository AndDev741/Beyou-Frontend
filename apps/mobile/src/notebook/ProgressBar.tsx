import { View } from 'react-native';

/** A thin bar for a 0..1 share. Decorative: the number beside it is what a reader hears. */
export default function ProgressBar({ share, testID }: { share: number; testID?: string }) {
  const width = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` as const;
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-surface-2" testID={testID}>
      <View className="h-full rounded-full bg-accent" style={{ width }} />
    </View>
  );
}
