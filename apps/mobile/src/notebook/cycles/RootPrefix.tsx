import { Text } from 'react-native';

/**
 * The root topic, small and muted, in front of a subject that is a page inside a topic:
 * "Software Engineer ›" before "Implementação 2.0". Meant to sit INSIDE the title's `<Text>`, so
 * it wraps and truncates with it and a screen reader reads the two as one line. Nothing for a
 * root subject, or when an older server sends no root.
 */
export default function RootPrefix({ root, className = '' }: { root: string | null | undefined; className?: string }) {
  if (!root) return null;
  return <Text className={`font-normal text-text-2 ${className}`} testID="subject-root">{`${root} › `}</Text>;
}
