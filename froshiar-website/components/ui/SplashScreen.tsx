'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplash } from '@/contexts/SplashContext';
import { usePathname } from '@/i18n/navigation';

export function SplashScreen() {
  const pathname = usePathname();
  // Splash ONLY runs on the main landing homepage (https://www.froshiar.store/ or /en)
  // NEVER on web stores (/[slug]), admin, privacy, terms, or other sections
  const isHomePage = pathname === '/' || pathname === '/en';

  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => !isHomePage);
  const { completeSplash } = useSplash();

  useEffect(() => {
    if (!isHomePage) {
      completeSplash();
      setIsLoaded(true);
      return;
    }

    // Lock scroll during splash animation
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const startTime = performance.now();
    const duration = 2700; // ~2.7 seconds loading time

    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth ease-out curve for natural percentage progression
      const current = Math.min(100, Math.round((1 - Math.pow(1 - t, 2.2)) * 100));
      setProgress(current);

      if (t < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // Progress reached 100% -> Trigger Liquid Glass transition
        setIsExiting(true);

        // After liquid glass bloom, smoothly exit and reveal main screen
        setTimeout(() => {
          setIsLoaded(true);
          completeSplash();
          document.body.style.overflow = originalOverflow;
        }, 350);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.body.style.overflow = originalOverflow;
    };
  }, [completeSplash, isHomePage]);

  if (!isHomePage) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          key="froshiar-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.08,
            filter: 'blur(20px)',
            transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
          }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none pointer-events-auto transition-colors duration-500 overflow-hidden ${
            isExiting ? 'bg-[#07090E]/65 backdrop-blur-3xl' : 'bg-[#07090E]'
          }`}
        >
          {/* Pure Seamless Boundless Radial Golden Glow (No square box, No clipping) */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(circle 380px at 50% 44%, rgba(212,175,55,0.20) 0%, rgba(212,175,55,0.04) 55%, transparent 75%)',
            }}
          />

          {/* Liquid Glass Expanding Ripple Wave on Exit */}
          {isExiting && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 2.4, opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute w-[420px] h-[420px] rounded-full border border-gold-400/40 bg-gold-400/[0.08] shadow-[0_0_60px_rgba(212,175,55,0.35)] blur-md -z-10"
            />
          )}

          {/* Liquid Glass Specular Light Beam Sweep */}
          {isExiting && (
            <motion.div
              initial={{ x: '-120%', opacity: 0 }}
              animate={{ x: '120%', opacity: [0, 0.75, 0] }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/[0.18] to-transparent skew-x-[-25deg] blur-lg -z-10"
            />
          )}

          {/* Central Logo, Title & Percentage Container */}
          <motion.div
            animate={
              isExiting
                ? {
                    scale: 1.06,
                    filter: 'blur(8px)',
                    opacity: 0.2,
                    transition: { duration: 0.5, ease: 'easeOut' },
                  }
                : {}
            }
            className="relative flex flex-col items-center justify-center px-6 text-center"
          >
            {/* Froshiar Transparent PNG Logo: BIG, STATIC, NO SQUARE BOX, NO RESIZING */}
            <div className="relative flex items-center justify-center mb-3">
              <Image
                src="/logo.png"
                alt="Froshiar"
                width={200}
                height={200}
                priority
                className="w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 object-contain"
              />
            </div>

            {/* Kurdish Brand Name: "فرۆشیار" */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-wide drop-shadow-[0_2px_16px_rgba(212,175,55,0.4)] font-kurdish"
            >
              فرۆشیار
            </motion.h1>

            {/* Kurdish Subtitle: "سیستەمی بەڕێوەبردنی فرۆشگا" (No English) */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 0.35, duration: 0.55 }}
              className="mt-1.5 text-xs sm:text-sm font-bold text-gold-400/90 tracking-wide font-kurdish"
            >
              سیستەمی بەڕێوەبردنی فرۆشگا
            </motion.p>

            {/* Percentage Display (0% -> 100%) - Minimalist Typography, No Progress Bar Line */}
            <div className="mt-8 flex items-center justify-center">
              <span className="font-mono text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-200 to-gold-400 drop-shadow-[0_2px_14px_rgba(212,175,55,0.4)] tracking-tight">
                {progress}
                <span className="text-base sm:text-lg text-gold-400/80 ml-0.5 font-bold">%</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
