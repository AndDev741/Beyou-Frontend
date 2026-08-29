import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Is this native module compiled into the running binary?
 *
 * Asked BEFORE requiring a package that wraps it, and the order is the whole point. A lazy
 * `require('expo-notifications')` inside a try/catch looked like enough, and it is not: in
 * development, Metro's `guardedLoadModule` wraps any require that happens OUTSIDE another module's
 * initialisation in its own guard, reports the factory's error through
 * `ErrorUtils.reportFatalError` (the red box), and returns `undefined` instead of rethrowing. The
 * catch never sees the error; the person sees "Uncaught Error: Cannot find native module
 * 'ExpoPushTokenManager'" every time a cycle starts or is skipped. That is what happened on the
 * first device test of the review fixes.
 *
 * `requireOptionalNativeModule` answers without throwing, so the package is only ever required
 * on a build that can satisfy it.
 */
export function hasNativeModule(name: string): boolean {
  try {
    return requireOptionalNativeModule(name) != null;
  } catch {
    return false;
  }
}
