import { type ReactNode } from 'react';
import { View, Text } from 'react-native';

interface WidgetCardProps {
  title: string;
  /** Mirrors the web BaseDiv flag. On mobile every widget is full-width, so this
   *  is accepted for parity but does not change the layout (see DashboardWidgets). */
  bigSize?: boolean;
  children: ReactNode;
  testID?: string;
}

/**
 * Card shell for a dashboard widget — the native equivalent of the web BaseDiv:
 * a primary-bordered rounded card with a centered title. Width is owned by the
 * parent (DashboardWidgets stacks widgets full-width), so `bigSize` is accepted
 * for API parity but intentionally ignored here.
 */
export default function WidgetCard({ title, children, testID }: WidgetCardProps) {
  return (
    <View
      className="w-full items-center justify-center rounded-md border-2 border-primary p-3"
      testID={testID}
    >
      <Text className="text-secondary mb-2 text-center text-lg font-semibold">{title}</Text>
      {children}
    </View>
  );
}
