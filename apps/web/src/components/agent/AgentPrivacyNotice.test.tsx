import { render, screen } from "@testing-library/react";
import AgentPrivacyNotice from "./AgentPrivacyNotice";

/**
 * Before this existed there was no string anywhere in the app saying that the
 * assistant talks to a company other than Beyou. That is the assertion worth
 * pinning: the sentence is present, and it goes somewhere that names them.
 */
test("says the conversation reaches an external provider, and links to the detail", () => {
    render(<AgentPrivacyNotice />);

    expect(screen.getByTestId("agent-privacy-notice")).toBeInTheDocument();
    expect(screen.getByText("AgentPrivacyNotice")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AgentPrivacyLink" }))
        .toHaveAttribute("href", "https://beyouweb.com/privacy/#ai");
});
