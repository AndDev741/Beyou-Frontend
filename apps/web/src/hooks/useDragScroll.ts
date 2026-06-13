import { useRef } from "react";

export function useDragScroll() {
    const ref = useRef<HTMLDivElement>(null);
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: React.MouseEvent) => {
        isDown = true;
        startX = e.pageX - (ref.current?.offsetLeft || 0);
        scrollLeft = ref.current?.scrollLeft || 0;
        document.body.style.userSelect = "none";
    };

    const onMouseLeave = () => {
        isDown = false;
        document.body.style.userSelect = "";
    };

    const onMouseUp = () => {
        isDown = false;
        document.body.style.userSelect = "";
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - (ref.current?.offsetLeft || 0);
        const walk = (x - startX) * 1; // scroll-fast
        if (ref.current) ref.current.scrollLeft = scrollLeft - walk;
    };

    // Touch events for mobile
    let touchStartX = 0;
    let touchScrollLeft = 0;

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX = e.touches[0].pageX - (ref.current?.offsetLeft || 0);
        touchScrollLeft = ref.current?.scrollLeft || 0;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        const x = e.touches[0].pageX - (ref.current?.offsetLeft || 0);
        const walk = (x - touchStartX) * 1;
        if (ref.current) ref.current.scrollLeft = touchScrollLeft - walk;
    };

    return {
        ref,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove,
        onTouchStart,
        onTouchMove,
    };
}