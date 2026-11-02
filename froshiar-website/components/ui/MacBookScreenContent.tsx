'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

export function MacBookScreenContent() {
  const locale = useLocale();
  const isCkb = locale === 'ckb';
  const messageText = isCkb ? 'بەڵێ فرۆشیار لێرەیە' : 'Yes, Froshiar is here';

  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (charCount < messageText.length) {
      const timer = setTimeout(() => {
        setCharCount((prev) => prev + 1);
      }, 45);
      return () => clearTimeout(timer);
    }
  }, [charCount, messageText.length]);

  const displayedText = messageText.slice(0, charCount);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 sm:p-5 select-none overflow-hidden">
      {/* Ambient gold radial aura behind logo and text */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 48%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.05) 50%, transparent 75%)',
        }}
      />

      {/* Subtle concentric tech rings */}
      <div
        className="pointer-events-none absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-gold-400/[0.08] -z-10 animate-pulse"
        style={{ animationDuration: '4s' }}
      />
      <div className="pointer-events-none absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-gold-400/[0.05] border-dashed -z-10" />

      {/* Transparent PNG Logo (No background box - pure golden Froshiar emblem) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center mb-2.5 sm:mb-3.5"
      >
        {/* Soft golden aura beneath logo */}
        <div className="absolute inset-0 bg-gold-500/25 blur-xl rounded-full scale-125 pointer-events-none" />
        <Image
          src="/logo.png"
          alt="Froshiar Logo"
          width={84}
          height={84}
          priority
          className="relative z-10 w-14 h-14 sm:w-20 sm:h-20 lg:w-22 lg:h-22 object-contain drop-shadow-[0_8px_20px_rgba(212,175,55,0.4)]"
        />
      </motion.div>

      {/* Blur-Typewriter Animated Text: "(بەڵێ فرۆشیار لێرەیە)" - 100% Cursive Connected Kurdish Text */}
      <div
        className="flex items-center justify-center text-center"
        aria-label={messageText}
      >
        <span className="inline-block text-white font-bold text-sm sm:text-lg lg:text-xl tracking-tight drop-shadow-[0_2px_10px_rgba(212,175,55,0.35)] whitespace-nowrap">
          {displayedText}
          {charCount < messageText.length && (
            <span className="inline-block w-[2px] sm:w-[3px] h-[0.85em] bg-gold-400 ms-1 align-middle animate-pulse" />
          )}
        </span>
      </div>

      {/* Clean Sub-Label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="mt-1.5 sm:mt-2 text-[9px] sm:text-[11px] font-semibold text-gold-400 tracking-widest uppercase font-mono"
      >
        ALL-IN-ONE CLOUD POS
      </motion.p>
    </div>
  );
}
