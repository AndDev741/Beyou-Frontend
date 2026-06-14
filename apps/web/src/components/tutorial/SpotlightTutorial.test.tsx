import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SpotlightTutorial, { SpotlightStep } from "./SpotlightTutorial";

const setupTarget = (id: string) => {
    const el = document.createElement("div");
    el.id = id;
    el.textContent = id;
    el.style.width = "100px";
    el.style.height = "100px";
    el.getBoundingClientRect = vi.fn(() => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({})
    })) as unknown as DOMRect;
    (el as HTMLElement).scrollIntoView = vi.fn();
    document.body.appendChild(el);
    return el;
};

const renderSpotlight = (steps: SpotlightStep[]) => {
    return render(
        <SpotlightTutorial
            steps={steps}
            isActive={true}
            onComplete={vi.fn()}
            onSkip={vi.fn()}
        />
    );
};

describe("SpotlightTutorial", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        window.innerWidth = 1024;
        window.innerHeight = 768;
        window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(cb, 0);
        window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("advances when action target is clicked", async () => {
        const target1 = setupTarget("target-1");
        setupTarget("target-2");

        const steps: SpotlightStep[] = [
            {
                id: "step-1",
                targetSelector: "#target-1",
                titleKey: "StepOneTitle",
                descriptionKey: "StepOneDescription",
                action: "click"
            },
            {
                id: "step-2",
                targetSelector: "#target-2",
                titleKey: "StepTwoTitle",
                descriptionKey: "StepTwoDescription"
            }
        ];

        renderSpotlight(steps);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(screen.getByText("StepOneTitle")).toBeInTheDocument();

        fireEvent.click(target1);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 350));
        });

        expect(await screen.findByText("StepTwoTitle")).toBeInTheDocument();
    });

    test("uses Next label on last step when forceNextLabel is true", async () => {
        setupTarget("target-next");
        const steps: SpotlightStep[] = [
            {
                id: "step-last",
                targetSelector: "#target-next",
                titleKey: "LastTitle",
                descriptionKey: "LastDesc",
                forceNextLabel: true
            }
        ];

        renderSpotlight(steps);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(screen.getByText("TutorialNext")).toBeInTheDocument();
        expect(screen.queryByText("TutorialFinish")).not.toBeInTheDocument();
    });

    test("hides tooltip on mobile for routine schedule modal", async () => {
        window.innerWidth = 360;
        setupTarget("target-modal");
        const steps: SpotlightStep[] = [
            {
                id: "routine-schedule-modal",
                targetSelector: "#target-modal",
                titleKey: "ScheduleModalTitle",
                descriptionKey: "ScheduleModalDescription",
                position: "top"
            }
        ];

        renderSpotlight(steps);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
        });

        expect(screen.queryByText("ScheduleModalTitle")).not.toBeInTheDocument();
        expect(screen.queryByText("TutorialStepOf")).not.toBeInTheDocument();
    });
});
