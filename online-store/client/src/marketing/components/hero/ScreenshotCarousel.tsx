import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SCREENSHOTS } from "../../data/screenshots";

const INTERVAL_MS = 3000;

export function ScreenshotCarousel({
  startIndex = 0,
  className = "",
  priority = false,
}: {
  startIndex?: number;
  className?: string;
  priority?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SCREENSHOTS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  const current = SCREENSHOTS[index];

  return (
    // dir="ltr": this frames literal app-screenshot content, which stays LTR
    // regardless of the homepage's own locale/direction (see PhoneMockup/TabletMockup).
    <div dir="ltr" className={`relative overflow-hidden ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={current.src}
          className="absolute inset-0"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={current.src}
            alt={current.alt}
            loading={priority && index === startIndex ? "eager" : "lazy"}
            fetchPriority={priority && index === startIndex ? "high" : "auto"}
            className="h-full w-full object-cover object-top"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
