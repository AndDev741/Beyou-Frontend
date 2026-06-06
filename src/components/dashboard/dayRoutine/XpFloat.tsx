import { motion, useReducedMotion } from "framer-motion";

type XpFloatProps = { xp: number };

export default function XpFloat({ xp }: XpFloatProps) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: reduceMotion ? 0 : -28 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute left-0 -top-3 text-sm font-bold text-primary pointer-events-none select-none whitespace-nowrap"
            aria-hidden="true"
            data-testid="xp-float"
        >
            +{xp} XP
        </motion.span>
    );
}
