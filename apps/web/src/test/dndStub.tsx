import type { ReactNode } from "react";

/**
 * A stand-in for react-beautiful-dnd in the unit suites.
 *
 * The library needs real layout to lift a row and jsdom measures everything as zero, so a drag
 * driven here would be the keyboard sensor limping through a fake DOM. Worse, its internal
 * scheduling deadlocks under the frozen clock the Pomodoro suite runs on, which is how a passing
 * test for a completely unrelated thing starts timing out the moment a list gains a drag handle.
 *
 * So the gesture is not simulated. What the stub gives back is a button that fires `onDragEnd`
 * with a known drop, which is the only part of a drag this repo actually wrote. The gesture itself
 * is proven in a real browser by the e2e spec.
 */
export const dndStub = {
    DragDropContext: ({
        children,
        onDragEnd,
    }: {
        children: ReactNode;
        onDragEnd: (result: unknown) => void;
    }) => (
        <div>
            <button
                type="button"
                data-testid="drop-second-onto-first"
                onClick={() =>
                    onDragEnd({ source: { index: 1 }, destination: { index: 0 }, draggableId: "2" })
                }
            />
            {children}
        </div>
    ),
    Droppable: ({ children }: { children: (p: unknown) => ReactNode }) =>
        children({ droppableProps: {}, innerRef: () => {}, placeholder: null }),
    Draggable: ({ children }: { children: (p: unknown) => ReactNode }) =>
        children({ draggableProps: {}, dragHandleProps: {}, innerRef: () => {} }),
};
