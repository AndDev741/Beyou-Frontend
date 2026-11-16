import { View } from 'react-native';
import Card from '../ui/Card';
import { Shimmer } from './Block';

/**
 * The shape of the screen while it loads, so the blocks do not jump when the data lands:
 * the overview's paragraph, the question with its box, then a shorter block.
 */
export default function Skeleton({ label }: { label: string }) {
  return (
    // One element for a screen reader: read card by card, the label would come three times.
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="gap-3"
      testID="second-brain-skeleton"
    >
      <Card className="px-[18px] py-4">
        <Shimmer label={label} lines={['45%', '100%', '92%', '60%']} />
      </Card>
      <Card className="px-[18px] py-4">
        <Shimmer label={label} lines={['50%', '100%', '100%']} />
      </Card>
      <Card className="px-[18px] py-4">
        <Shimmer label={label} lines={['40%', '80%', '66%']} />
      </Card>
    </View>
  );
}
