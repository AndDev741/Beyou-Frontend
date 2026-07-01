import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { useTutorialRegistry } from './TutorialProvider';

export function useTutorialTarget(id: string) {
  const ref = useRef<View | null>(null);
  const registry = useTutorialRegistry();
  useEffect(() => {
    registry.register(id, ref);
    return () => registry.unregister(id);
  }, [id, registry]);
  return ref;
}
