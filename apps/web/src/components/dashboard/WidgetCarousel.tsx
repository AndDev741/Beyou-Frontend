import { useRef, useState, type ReactNode } from "react";

/**
 * Carrossel de widgets do mobile: altura fixa, um por vez, com pontos de
 * página. A rotina nunca desce conforme o usuário adiciona widget — que era o
 * problema de empilhá-los.
 */
export default function WidgetCarousel({ children }: { children: ReactNode[] }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        // O passo é a largura visível: cada slide ocupa a viewport do trilho.
        setActive(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    };

    return (
        <div className="lg:hidden">
            <div
                ref={trackRef}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {children.map((child, index) => (
                    <div key={index} className="w-full shrink-0 snap-center">
                        {child}
                    </div>
                ))}
            </div>

            {children.length > 1 && (
                <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
                    {children.map((_, index) => (
                        <span
                            key={index}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                                index === active ? "w-4 bg-accent" : "w-1.5 bg-border"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
