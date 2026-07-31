import { useEffect, useState } from "react";

/**
 * Tailwind's `lg` breakpoint in pixels — the width at and above which this app
 * shows its desktop layout.
 *
 * INTENTIONALLY 1100 and not Tailwind's default 1024: see the note in
 * `tailwind.config.js`. `useIsDesktop.test.ts` pins this against that file so
 * the two cannot drift apart silently.
 */
export const LG_BREAKPOINT_PX = 1100;

const DESKTOP_QUERY = `(min-width: ${LG_BREAKPOINT_PX}px)`;

/**
 * True at `lg` and above, i.e. exactly where the `lg:` Tailwind variants apply.
 *
 * For chrome whose PRESENCE depends on width, not just its styling: rendering
 * the decision in JS keeps the rule in one readable place instead of splitting
 * it between a route conditional and a responsive class, and it makes the
 * outcome assertable — jsdom evaluates no media queries, so anything hidden
 * purely by `lg:hidden` looks present to every test.
 *
 * Use a Tailwind class instead for anything that is only *styled* differently
 * across widths; this hook re-renders, a class does not.
 */
export function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState(
        () => window.matchMedia(DESKTOP_QUERY).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(DESKTOP_QUERY);
        // Re-read on mount as well as on change: a rotation or a window resize
        // between the initial render and this effect would otherwise stick.
        setIsDesktop(mediaQuery.matches);
        const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    return isDesktop;
}
