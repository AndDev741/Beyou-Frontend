import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/test-utils";
import ReminderConfiguration from "../ReminderConfiguration";
import {
    onReminderPreferences,
    onReminderResync,
    type ReminderPreferenceChange,
} from "../../calendar/reminderPreferenceBus";

const getPreferences = vi.fn();
const updatePreferences = vi.fn();

vi.mock("@beyou/api/notification/notificationPreferences", () => ({
    getNotificationPreferences: () => getPreferences(),
    updateNotificationPreferences: (patch: unknown) => updatePreferences(patch),
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@beyou/api/apiError", () => ({ getFriendlyErrorMessage: () => "Something went wrong" }));

const STORED = { engagementEmail: true, reminderEmail: true, reminderWeb: true, reminderDefaultTime: "09:00" };

const installNotification = (permission: NotificationPermission, answer: NotificationPermission = "granted") => {
    class FakeNotification {
        static permission: NotificationPermission = permission;
        static requestPermission = vi.fn(async () => {
            FakeNotification.permission = answer;
            return answer;
        });
    }
    vi.stubGlobal("Notification", FakeNotification);
    return FakeNotification;
};

const web = () => screen.getByTestId("reminder-web-toggle");
const email = () => screen.getByTestId("reminder-email-toggle");
const time = () => screen.getByTestId("reminder-default-time");

const renderLoaded = async () => {
    renderWithProviders(<ReminderConfiguration />);
    await waitFor(() => expect(web()).toBeEnabled());
};

describe("ReminderConfiguration", () => {
    beforeEach(() => {
        getPreferences.mockResolvedValue({ data: STORED });
        updatePreferences.mockImplementation(async (patch: object) => ({ data: { ...STORED, ...patch } }));
        installNotification("granted");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows the stored values once loaded", async () => {
        getPreferences.mockResolvedValue({ data: { ...STORED, reminderEmail: false, reminderDefaultTime: "07:45" } });

        await renderLoaded();

        expect(web()).toHaveAttribute("aria-checked", "true");
        expect(email()).toHaveAttribute("aria-checked", "false");
        expect(time()).toHaveValue("07:45");
    });

    it("sends only the browser switch when it is flipped", async () => {
        await renderLoaded();

        await userEvent.click(web());

        expect(updatePreferences).toHaveBeenCalledWith({ reminderWeb: false });
        await waitFor(() => expect(web()).toHaveAttribute("aria-checked", "false"));
    });

    it("sends only the email switch when it is flipped", async () => {
        await renderLoaded();

        await userEvent.click(email());

        expect(updatePreferences).toHaveBeenCalledWith({ reminderEmail: false });
    });

    it("saves the default time when the field is left", async () => {
        await renderLoaded();

        fireEvent.change(time(), { target: { value: "08:30" } });
        expect(updatePreferences).not.toHaveBeenCalled();
        fireEvent.blur(time());

        expect(updatePreferences).toHaveBeenCalledWith({ reminderDefaultTime: "08:30" });
    });

    /** Untimed tasks remind at this time, so a running hub has to re-arm them right away. */
    it("asks the reminder hub to re-arm once a new default time is saved", async () => {
        const resync = vi.fn();
        const stop = onReminderResync(resync);
        await renderLoaded();

        fireEvent.change(time(), { target: { value: "08:30" } });
        fireEvent.blur(time());

        await waitFor(() => expect(resync).toHaveBeenCalledTimes(1));
        stop();
    });

    it("does not ask for a re-arm when the time failed to save", async () => {
        updatePreferences.mockResolvedValue({ error: { errorKey: "UnexpectedError" } });
        const resync = vi.fn();
        const stop = onReminderResync(resync);
        await renderLoaded();

        fireEvent.change(time(), { target: { value: "08:30" } });
        fireEvent.blur(time());

        await waitFor(() => expect(time()).toHaveValue("09:00"));
        expect(resync).not.toHaveBeenCalled();
        stop();
    });

    it("does not save a time that did not change", async () => {
        await renderLoaded();

        fireEvent.blur(time());

        expect(updatePreferences).not.toHaveBeenCalled();
    });

    it("puts a switch back when the save fails", async () => {
        updatePreferences.mockResolvedValue({ error: { errorKey: "UnexpectedError" } });
        await renderLoaded();

        await userEvent.click(email());

        await waitFor(() => expect(email()).toHaveAttribute("aria-checked", "true"));
    });

    it("tells the running reminder hub when browser reminders change", async () => {
        const heard: ReminderPreferenceChange[] = [];
        const stop = onReminderPreferences((change) => heard.push(change));
        getPreferences.mockResolvedValue({ data: { ...STORED, reminderWeb: false } });
        await renderLoaded();

        await userEvent.click(web());

        await waitFor(() => expect(heard).toContainEqual({ reminderWeb: true }));
        stop();
    });

    it("stays unavailable when the preferences cannot be loaded", async () => {
        getPreferences.mockResolvedValue({ error: { errorKey: "UnexpectedError" } });
        renderWithProviders(<ReminderConfiguration />);

        await waitFor(() => expect(getPreferences).toHaveBeenCalled());
        expect(web()).toBeDisabled();
        expect(email()).toBeDisabled();
        await userEvent.click(web());
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    describe("the browser's permission", () => {
        it("offers the prompt while undecided, and asks only from the click", async () => {
            const api = installNotification("default", "granted");
            const heard: ReminderPreferenceChange[] = [];
            const stop = onReminderPreferences((change) => heard.push(change));
            await renderLoaded();
            expect(api.requestPermission).not.toHaveBeenCalled();

            await act(async () => {
                await userEvent.click(screen.getByTestId("reminder-web-permission"));
            });

            expect(api.requestPermission).toHaveBeenCalledTimes(1);
            await waitFor(() => expect(screen.queryByTestId("reminder-web-permission")).not.toBeInTheDocument());
            expect(heard).toHaveLength(1);
            stop();
        });

        it("explains a refusal instead of asking again", async () => {
            installNotification("denied");
            await renderLoaded();

            expect(screen.getByTestId("reminder-web-denied")).toHaveTextContent("ReminderWebPermissionDenied");
            expect(screen.queryByTestId("reminder-web-permission")).not.toBeInTheDocument();
        });

        it("says when the browser cannot show notifications at all", async () => {
            vi.unstubAllGlobals();
            await renderLoaded();

            expect(screen.getByTestId("reminder-web-unsupported")).toHaveTextContent("ReminderWebUnsupported");
        });

        it("asks nothing once granted", async () => {
            await renderLoaded();

            expect(screen.queryByTestId("reminder-web-permission")).not.toBeInTheDocument();
            expect(screen.queryByTestId("reminder-web-denied")).not.toBeInTheDocument();
        });
    });
});
