/// <reference types="vite/client" />

/** Injected by Vite's `define` (see vite.config.ts) from package.json `version`. */
declare const __APP_VERSION__: string;

/**
 * Injected by Vite's `define` (see vite.config.ts). The single expression both
 * the runtime SDK and the source-map upload derive their release name from, so
 * an uploaded map can never drift from the events it is meant to resolve.
 */
declare const __SENTRY_RELEASE__: string;

interface ImportMetaEnv {
    /**
     * DSN of the self-hosted GlitchTip collector. Empty/absent disables error
     * telemetry entirely — see src/lib/telemetry.ts.
     */
    readonly VITE_SENTRY_DSN?: string;
}
