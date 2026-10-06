import { createContext, useContext, useEffect } from "react";

/**
 * The shell's bottom spacer keeps the floating assistant button and the timer pill from covering
 * the end of a page (ProtectedRoute). A page that reserves its own bottom space can turn it off on
 * desktop; phones keep it whatever the page says, because the bottom bar covers the page there.
 */
const DesktopSpacerContext = createContext<(on: boolean) => void>(() => {});

export const DesktopSpacerProvider = DesktopSpacerContext.Provider;

/** Turns the shell's desktop bottom spacer off while the calling page is mounted. */
export function useNoDesktopSpacer() {
    const setSpacer = useContext(DesktopSpacerContext);
    useEffect(() => {
        setSpacer(false);
        return () => setSpacer(true);
    }, [setSpacer]);
}
