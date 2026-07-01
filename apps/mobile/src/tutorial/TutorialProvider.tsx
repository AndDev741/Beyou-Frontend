import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';

export type Rect = { x: number; y: number; width: number; height: number };

type Registry = {
  register: (id: string, ref: RefObject<View | null>) => void;
  unregister: (id: string) => void;
  measure: (id: string) => Promise<Rect | null>;
};

const TutorialContext = createContext<Registry | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const refs = useRef(new Map<string, RefObject<View | null>>());

  const value = useMemo<Registry>(() => ({
    register: (id, ref) => { refs.current.set(id, ref); },
    unregister: (id) => { refs.current.delete(id); },
    measure: (id) =>
      new Promise((resolve) => {
        const ref = refs.current.get(id);
        const node = ref?.current;
        if (!node || typeof node.measureInWindow !== 'function') return resolve(null);
        node.measureInWindow((x, y, width, height) => {
          if (!width && !height) resolve(null);
          else resolve({ x, y, width, height });
        });
      }),
  }), []);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorialRegistry(): Registry {
  // No-op fallback keeps non-tutorial renders + unit tests cheap.
  return useContext(TutorialContext) ?? NOOP;
}

const NOOP: Registry = { register: () => {}, unregister: () => {}, measure: async () => null };
