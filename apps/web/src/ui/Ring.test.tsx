import { render } from "@testing-library/react";
import Ring from "./Ring";

describe("Ring", () => {
    it("desenha o anel completo no estado feito", () => {
        const { container } = render(<Ring state="done" size={24} />);
        const circles = container.querySelectorAll("circle");
        // trilha + valor
        expect(circles).toHaveLength(2);
        expect(circles[1].getAttribute("stroke-dashoffset")).toBe("0");
    });

    it("não desenha valor quando está a fazer", () => {
        const { container } = render(<Ring state="todo" />);
        expect(container.querySelectorAll("circle")).toHaveLength(1);
    });

    it("recorta o progresso fora da faixa 0..1", () => {
        const { container } = render(<Ring state="progress" progress={3} size={40} />);
        const value = container.querySelectorAll("circle")[1];
        expect(value.getAttribute("stroke-dashoffset")).toBe("0");
    });

    it("engrossa o traço junto com o tamanho", () => {
        const { container: small } = render(<Ring size={20} />);
        const { container: big } = render(<Ring size={96} />);
        const width = (c: HTMLElement) => Number(c.querySelector("circle")!.getAttribute("stroke-width"));
        expect(width(big)).toBeGreaterThan(width(small));
    });
});
