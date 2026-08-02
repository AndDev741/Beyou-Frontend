import { motion, useReducedMotion } from "framer-motion";

type XpFloatProps = { xp: number };

/** O chip de XP sobe 1.2s e some. Sob reduced-motion ele só desvanece. */
export default function XpFloat({ xp }: XpFloatProps) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.span
            initial={{ opacity: 1, y: 0, scale: reduceMotion ? 1 : 0.9 }}
            animate={{ opacity: 0, y: reduceMotion ? 0 : -30, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute -top-4 left-0 z-10 select-none whitespace-nowrap rounded-full bg-xp-soft px-2 py-0.5 font-mono text-xs font-semibold text-xp"
            aria-hidden="true"
            data-testid="xp-float"
        >
            +{xp} XP
        </motion.span>
    );
}
