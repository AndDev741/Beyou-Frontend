import { screen, waitFor } from "@testing-library/react";
import { ToastContainer, toast } from "react-toastify";
import { renderWithProviders } from "../test/test-utils";
import { ToastCloseButton, ToastTypeIcon, notify } from "./notify";

function Host() {
    return (
        <ToastContainer
            position="top-right"
            limit={3}
            icon={ToastTypeIcon}
            closeButton={ToastCloseButton}
            toastClassName="beyou-toast"
        />
    );
}

afterEach(() => {
    toast.dismiss();
});

test("renders title and subtitle", async () => {
    renderWithProviders(<Host />);
    notify.success("Meditar", { subtitle: "Mais um dia no lugar certo" });

    expect(await screen.findByText("Meditar")).toBeInTheDocument();
    expect(screen.getByText("Mais um dia no lugar certo")).toBeInTheDocument();
});

test("uses the entity icon when one is given", async () => {
    renderWithProviders(<Host />);
    notify.success("Correr", { icon: <span data-testid="habit-icon" /> });

    expect(await screen.findByTestId("habit-icon")).toBeInTheDocument();
});

test("falls back to the tone icon and keeps a close button", async () => {
    const { container } = renderWithProviders(<Host />);
    notify.error("Falhou");

    await screen.findByText("Falhou");
    expect(container.querySelector("svg.lucide-circle-alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
});

test("plain toast calls still get the shared shell", async () => {
    const { container } = renderWithProviders(<Host />);
    toast.success("Salvo");

    await screen.findByText("Salvo");
    await waitFor(() =>
        expect(container.querySelector(".beyou-toast.Toastify__toast--success")).toBeInTheDocument()
    );
});

/**
 * The X drifted to wherever the text happened to end, leaving it mid-toast with empty
 * space in the corner. Two things had to be true and neither was: the body claims the
 * width between the icon and the button, and the button is pushed to the edge rather
 * than nudged by a fixed margin.
 *
 * Asserted through the classes, which is the honest limit here — jsdom computes no
 * layout, so nothing in this environment can measure where the button actually lands.
 * What it does catch is somebody putting the fixed margin back.
 */
test("keeps the close button pinned to the toast's edge", async () => {
    renderWithProviders(<Host />);
    notify.success("Momento em família", { subtitle: "Presença genuína é o melhor presente." });

    const close = await screen.findByRole("button", { name: /close/i });
    expect(close.className).toContain("ml-auto");
    expect(close.className).not.toContain("ml-1");
    // And it never gives up width to a long title.
    expect(close.className).toContain("shrink-0");
});
