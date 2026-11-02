'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useSplash } from '@/contexts/SplashContext';

const TITLE_DATA = {
  ckb: {
    prefix: 'لەگەڵ فرۆشیار،',
    phrases: [
      'فرۆشتنەکەت ئاسانتر بکە',
      'ئەزموونی فرۆشتن تاقی بکەوە',
      'هێز بدە بە بزنسەکەت',
      'کوالێتی ئیشکردنت بگۆڕە',
    ],
  },
  en: {
    prefix: 'With Froshiar,',
    phrases: [
      'Make Selling Easier',
      'Experience Modern Selling',
      'Empower Your Business',
      'Transform Your Workflow',
    ],
  },
};

// Characters in Kurdish / Arabic that do NOT connect to the subsequent letter (forward non-connectors)
const NON_CONNECTING_FORWARD = new Set(['ا', 'آ', 'د', 'ذ', 'ر', 'ز', 'ژ', 'و', 'ۆ', 'ڕ', 'ە']);

/**
 * Shapes a Kurdish word into individual characters using Zero-Width Joiners (\u200D)
 * so each character retains its authentic cursive ligature even inside separate animation spans.
 */
function shapeKurdishWord(word: string): string[] {
  const chars = Array.from(word);
  const n = chars.length;
  return chars.map((c, i) => {
    const connectFromRight = i > 0 && !NON_CONNECTING_FORWARD.has(chars[i - 1]);
    const connectToLeft = i < n - 1 && !NON_CONNECTING_FORWARD.has(c);
    const prefix = connectFromRight ? '\u200D' : '';
    const suffix = connectToLeft ? '\u200D' : '';
    return `${prefix}${c}${suffix}`;
  });
}

export function HeroTitleBlurTypewriter() {
  const locale = useLocale();
  const lang = locale === 'ckb' ? 'ckb' : 'en';
  const data = TITLE_DATA[lang];
  const isEn = lang === 'en';

  const { isSplashFinished } = useSplash();

  const [phraseIndex, setPhraseIndex] = useState(0);

  const currentPhrase = data.phrases[phraseIndex % data.phrases.length];

  // Prepare words and individual characters with global indices for staggered blur typing
  const { wordData, totalChars } = useMemo(() => {
    const words = currentPhrase.split(' ');
    let runningIndex = 0;
    const mapped = words.map((word) => {
      const chars = isEn ? Array.from(word) : shapeKurdishWord(word);
      const charsWithIndex = chars.map((ch) => ({
        char: ch,
        index: runningIndex++,
      }));
      return { word, charsWithIndex };
    });
    return { wordData: mapped, totalChars: runningIndex };
  }, [currentPhrase, isEn]);

  // Cycle to next phrase after character-by-character blur typing + reading hold
  useEffect(() => {
    if (!isSplashFinished) return;

    // Typing duration: staggered delay per char + entrance transition
    const typingDuration = totalChars * 48 + 420;
    // Comfortable reading hold duration
    const holdDuration = 2500;

    const timer = setTimeout(() => {
      setPhraseIndex((prev) => (prev + 1) % data.phrases.length);
    }, typingDuration + holdDuration);

    return () => clearTimeout(timer);
  }, [isSplashFinished, phraseIndex, totalChars, data.phrases.length]);

  const prefixWords = data.prefix.trim().split(/\s+/);

  return (
    <h1
      aria-label={`${data.prefix} ${currentPhrase}`}
      className="text-[1.75rem] xs:text-[2.15rem] sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.2] sm:leading-[1.18] min-h-[5.6rem] xs:min-h-[6.5rem] sm:min-h-[7.5rem] lg:min-h-[9rem] flex flex-col items-center justify-center gap-1 xs:gap-2 sm:gap-2.5 lg:gap-3 select-none"
    >
      {/* Row 1: Brand Prefix (Always Top Row — Blurs in softly, stays permanently visible) */}
      <span className="block w-full text-center text-ink dark:text-white shrink-0 drop-shadow-sm whitespace-nowrap">
        <span className="inline-flex items-center justify-center gap-x-2 sm:gap-x-2.5">
          {prefixWords.map((word, idx) => (
            <motion.span
              key={`prefix-${lang}-${idx}`}
              initial={{ opacity: 0, filter: 'blur(10px)', y: 6 }}
              animate={
                isSplashFinished
                  ? { opacity: 1, filter: 'blur(0px)', y: 0 }
                  : { opacity: 0, filter: 'blur(10px)', y: 6 }
              }
              transition={{
                duration: 0.45,
                delay: idx * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              {word}
            </motion.span>
          ))}
        </span>
      </span>

      {/* Row 2: Rotating Phrase (Blur-typewriter effect where each letter blurs in sequentially like Vercel BlurText) */}
      <span className="relative block w-full text-center text-amber-500 dark:text-[#f8c61e] drop-shadow-[0_0_24px_rgba(248,198,30,0.35)] whitespace-nowrap">
        <AnimatePresence mode="wait">
          <motion.span
            key={`phrase-${lang}-${phraseIndex}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="inline-flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-2.5"
          >
            {wordData.map((w, wIdx) => (
              <span key={`word-${phraseIndex}-${wIdx}`} className="inline-block whitespace-nowrap">
                {w.charsWithIndex.map((item) => (
                  <motion.span
                    key={`char-${phraseIndex}-${item.index}`}
                    variants={{
                      hidden: {
                        opacity: 0,
                        filter: 'blur(12px)',
                        y: 4,
                        scale: 0.97,
                      },
                      visible: {
                        opacity: 1,
                        filter: 'blur(0px)',
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: 0.36,
                          delay: item.index * 0.048,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                      exit: {
                        opacity: 0,
                        filter: 'blur(12px)',
                        y: -4,
                        scale: 0.97,
                        transition: {
                          duration: 0.26,
                          delay: (totalChars - 1 - item.index) * 0.012,
                          ease: 'easeInOut',
                        },
                      },
                    }}
                    className="inline-block"
                  >
                    {item.char}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </h1>
  );
}
