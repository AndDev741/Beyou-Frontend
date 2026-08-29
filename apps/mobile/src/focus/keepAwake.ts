import { hasNativeModule } from './nativeModule';

type KeepAwakeModule = typeof import('expo-keep-awake');

/**
 * `expo-keep-awake`, loaded lazily and only when the binary carries it, as `notifyCycleEnd` does:
 * it is a native module, and a build compiled before it existed must get a screen that dims
 * rather than a focus route that fails to load at all.
 */
let keepAwakeModule: KeepAwakeModule | null | undefined;
function keepAwake(): KeepAwakeModule | null {
  if (keepAwakeModule !== undefined) return keepAwakeModule;
  // Asked first, not caught after: Metro reports a missing native module as fatal instead of
  // throwing to a lazy require's catch (see `nativeModule.ts`).
  if (!hasNativeModule('ExpoKeepAwake')) {
    keepAwakeModule = null;
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  keepAwakeModule = (require('expo-keep-awake') as KeepAwakeModule | undefined) ?? null;
  return keepAwakeModule;
}

/** Hold the screen on under `tag`. Swallows every failure: the cycle runs, the screen just dims. */
export async function holdScreenAwake(tag: string): Promise<void> {
  const module = keepAwake();
  if (!module) return;
  try {
    await module.activateKeepAwakeAsync(tag);
  } catch {
    /* unsupported platform */
  }
}

/** Release the hold. Safe to call when nothing was held. */
export function releaseScreenAwake(tag: string): void {
  const module = keepAwake();
  if (!module) return;
  try {
    module.deactivateKeepAwake(tag);
  } catch {
    /* never activated */
  }
}
