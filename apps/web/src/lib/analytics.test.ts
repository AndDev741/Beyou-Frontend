import { describe, it, expect } from "vitest";
import type { CaptureResult } from "posthog-js";
import { scrubEventUrls } from "./analytics";

/**
 * Pins the scrub the way telemetry.test does for the error collector: on the
 * produced event, not the configuration. The motivating leak was observed in
 * production — the Google OAuth callback's `?state=…&code=…` captured verbatim
 * into `$current_url` on a pageview.
 */
describe("scrubEventUrls", () => {
    const oauthUrl =
        "https://app.beyouweb.com/?state=abc123&code=4%2F0secret&scope=email+profile";

    function event(overrides: Partial<CaptureResult>): CaptureResult {
        return { event: "$pageview", properties: {}, ...overrides } as CaptureResult;
    }

    it("strips the query string from every URL-bearing property", () => {
        const scrubbed = scrubEventUrls(
            event({
                properties: {
                    $current_url: oauthUrl,
                    $referrer: "https://app.beyouweb.com/reset-password?token=live-credential",
                    $session_entry_url: oauthUrl,
                },
            }),
        );

        expect(scrubbed?.properties.$current_url).toBe("https://app.beyouweb.com/");
        expect(scrubbed?.properties.$referrer).toBe("https://app.beyouweb.com/reset-password");
        expect(scrubbed?.properties.$session_entry_url).toBe("https://app.beyouweb.com/");
    });

    it("scrubs the $set_once initial URLs that ride person profiles", () => {
        const scrubbed = scrubEventUrls(
            event({ $set_once: { $initial_current_url: oauthUrl, $initial_referrer: "$direct" } }),
        );

        const setOnce = scrubbed?.$set_once as Record<string, unknown>;
        expect(setOnce.$initial_current_url).toBe("https://app.beyouweb.com/");
        expect(setOnce.$initial_referrer).toBe("$direct");
    });

    it("leaves query-less URLs and non-string values alone, and passes null through", () => {
        const scrubbed = scrubEventUrls(
            event({ properties: { $current_url: "https://app.beyouweb.com/dashboard", $referrer: 7 } }),
        );
        expect(scrubbed?.properties.$current_url).toBe("https://app.beyouweb.com/dashboard");
        expect(scrubbed?.properties.$referrer).toBe(7);
        expect(scrubEventUrls(null)).toBeNull();
    });
});
