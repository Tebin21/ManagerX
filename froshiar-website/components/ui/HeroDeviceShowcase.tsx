'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MacBookScreenContent } from './MacBookScreenContent';
import { IpadFrontMockup } from './IpadFrontMockup';
import { IphoneFrontMockup } from './IphoneFrontMockup';

export function HeroDeviceShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-6xl select-none"
      aria-label="Froshiar multi-device experience"
    >
      {/* Ambient Luxury Gold Halo Lighting behind the devices */}
      <div
        className="pointer-events-none absolute -inset-x-12 sm:-inset-x-24 -top-20 sm:-top-28 h-80 sm:h-[460px] -z-10 opacity-75 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(212,175,55,0.24) 0%, rgba(212,175,55,0.06) 50%, transparent 75%)',
        }}
      />

      {/* ===================================================================== */}
      {/* 1. MOBILE & TABLET VIEW (< lg): ONLY iPad + iPhone in 3D (No MacBook)  */}
      {/* ===================================================================== */}
      <div className="flex lg:hidden flex-col items-center justify-center py-6 sm:py-10">
        <div
          className="relative flex items-end justify-center w-full max-w-lg mx-auto"
          style={{ perspective: 1200 }}
        >
          {/* Ground Contact Shadow (Soft Blur) */}
          <div className="absolute -bottom-6 inset-x-8 h-12 bg-black/80 blur-2xl rounded-full pointer-events-none -z-10" />

          {/* iPad Pro Front Screen (Standing 3D Angled, Tilted Back-Left) */}
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotateY: [-13, -11, -13],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1200px) rotateY(-12deg) rotateX(4deg)',
            }}
            className="w-[230px] xs:w-[270px] sm:w-[330px] md:w-[360px] shrink-0 z-10 -mr-10 xs:-mr-14 sm:-mr-18 drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)]"
          >
            <IpadFrontMockup />
          </motion.div>

          {/* iPhone 16 Pro Front Screen (Standing 3D Angled in Front-Right) */}
          <motion.div
            animate={{
              y: [0, -9, 0],
              rotateY: [-7, -5, -7],
            }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.3,
            }}
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg) translateZ(45px)',
            }}
            className="w-[125px] xs:w-[145px] sm:w-[180px] md:w-[200px] shrink-0 z-20 drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
          >
            <IphoneFrontMockup />
          </motion.div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. DESKTOP VIEW (>= lg): Majestic Trio (iPad + MacBook + iPhone)      */}
      {/* MacBook in center, iPad on left (front), iPhone on right (front)      */}
      {/* ===================================================================== */}
      <div className="hidden lg:flex relative items-end justify-center w-full aspect-[1100/580] py-4">
        {/* Floor Stage Ambient Glow & Contact Shadows */}
        <div className="absolute bottom-4 inset-x-12 h-16 bg-black/90 blur-3xl rounded-full pointer-events-none -z-10" />

        {/* 1. iPad Pro (Left Flank - 3D Inward Angled Front Screen) */}
        <motion.div
          animate={{
            y: [0, -6, 0],
            rotateY: [15, 13, 15],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'perspective(1200px) rotateY(14deg) rotateX(2deg)',
          }}
          className="absolute left-[3%] bottom-6 w-[270px] xl:w-[305px] z-20 drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)]"
        >
          <IpadFrontMockup />
        </motion.div>

        {/* 2. MacBook Pro (Centerpiece Display) */}
        <div className="relative w-[650px] xl:w-[740px] aspect-[16/10] z-10 mx-auto">
          {/* Photorealistic MacBook SVG Deck & Lid */}
          <svg
            viewBox="0 0 740 460"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full drop-shadow-2xl overflow-visible pointer-events-none"
          >
            <defs>
              <filter id="mac-ground-shadow" x="-30%" y="-40%" width="160%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="22" />
              </filter>
              <linearGradient id="mac-deck-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3C3F48" />
                <stop offset="20%" stopColor="#22252C" />
                <stop offset="70%" stopColor="#141519" />
                <stop offset="100%" stopColor="#0B0C0E" />
              </linearGradient>
              <linearGradient id="mac-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3A3D46" stopOpacity="0.1" />
                <stop offset="25%" stopColor="#7E8496" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#C4C9D8" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#7E8496" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3A3D46" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Ground Shadow */}
            <ellipse
              cx="370"
              cy="442"
              rx="330"
              ry="16"
              fill="#000000"
              fillOpacity="0.9"
              filter="url(#mac-ground-shadow)"
            />

            {/* Display Outer Lid */}
            <rect
              x="55"
              y="22"
              width="630"
              height="394"
              rx="18"
              fill="#101115"
              stroke="#2C2E38"
              strokeWidth="1.5"
            />
            {/* Top Lid Chamfer Light Line */}
            <path
              d="M 72 22 L 668 22"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Display Bezel */}
            <rect
              x="67"
              y="34"
              width="606"
              height="370"
              rx="12"
              fill="#08080C"
              stroke="#1A1B22"
              strokeWidth="1"
            />

            {/* Camera Notch */}
            <rect x="325" y="38" width="90" height="14" rx="4" fill="#08080C" />
            <circle cx="370" cy="45" r="2.2" fill="#03060C" stroke="#161822" strokeWidth="0.8" />
            <circle cx="370.5" cy="44.5" r="0.6" fill="#4ADE80" opacity="0.6" />

            {/* Display Hinge Bar */}
            <rect x="100" y="410" width="540" height="6" rx="2" fill="#0A0B0E" />

            {/* Base Front Lip / Deck */}
            <rect
              x="20"
              y="414"
              width="700"
              height="20"
              rx="8"
              fill="url(#mac-deck-grad)"
              stroke="#2F323A"
              strokeWidth="0.8"
            />
            {/* Deck Chamfer Highlight Line */}
            <line
              x1="30"
              y1="415"
              x2="710"
              y2="415"
              stroke="url(#mac-highlight)"
              strokeWidth="1.2"
            />
            {/* Center Thumb Notch */}
            <rect x="326" y="414.5" width="88" height="5" rx="2.5" fill="#07080A" />
          </svg>

          {/* Active MacBook Display Overlay (HTML/CSS Live Typewriter Content) */}
          <div
            className="absolute rounded-[1.4%] overflow-hidden bg-[#07080D] z-10"
            style={{
              left: '9.05%',
              top: '7.39%',
              width: '81.9%',
              height: '80.4%',
            }}
          >
            <MacBookScreenContent />
            {/* Glass Glare */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.01] to-transparent"
            />
          </div>
        </div>

        {/* 3. iPhone 16 Pro (Right Flank - 3D Inward Angled Front Screen) */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotateY: [-15, -13, -15],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.25,
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'perspective(1200px) rotateY(-14deg) rotateX(2deg)',
          }}
          className="absolute right-[5%] bottom-6 w-[155px] xl:w-[175px] z-20 drop-shadow-[0_25px_50px_rgba(0,0,0,0.92)]"
        >
          <IphoneFrontMockup />
        </motion.div>
      </div>
    </motion.div>
  );
}
