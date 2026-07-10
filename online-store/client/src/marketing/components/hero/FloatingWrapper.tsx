import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function FloatingWrapper({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={shouldReduceMotion ? undefined : { y: [0, -14, 0] }}
      transition={
        shouldReduceMotion
          ? undefined
          : { duration: 6, repeat: Infinity, ease: "easeInOut", delay }
      }
    >
      {children}
    </motion.div>
  );
}
