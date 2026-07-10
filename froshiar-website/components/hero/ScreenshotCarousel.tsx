"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { SCREENSHOTS } from "@/lib/screenshots";

const INTERVAL_MS = 3000;

export function ScreenshotCarousel({
  startIndex = 0,
  className = "",
  sizes,
  priority = false,
}: {
  startIndex?: number;
  className?: string;
  sizes: string;
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
    // dir="ltr": this frames literal app-screenshot content, which stays
    // LTR regardless of the site's locale/direction (see PhoneMockup/TabletMockup).
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
          <Image
            src={current.src}
            alt={current.alt}
            fill
            sizes={sizes}
            priority={priority && index === startIndex}
            className="object-cover object-top"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
