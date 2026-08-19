import { render, screen } from "@testing-library/react";
import PrivacyPolicyLink from "./PrivacyPolicyLink";

/**
 * The point of this component is that the policy is reachable at all — there was no
 * route to it from inside the app — so what these check is the href, not the styling.
 */
test("links out to the privacy policy in a new tab", () => {
    render(<PrivacyPolicyLink />);

    const link = screen.getByTestId("privacy-policy-link");
    expect(link).toHaveAttribute("href", "https://beyouweb.com/privacy/");
    expect(link).toHaveAttribute("target", "_blank");
    // Without noreferrer the policy page can reach back through window.opener.
    expect(link).toHaveAttribute("rel", "noreferrer");
});
