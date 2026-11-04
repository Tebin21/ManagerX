'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IpadFrontMockup } from './IpadFrontMockup';
import { IphoneFrontMockup } from './IphoneFrontMockup';

export function MobileHeroDevices3D() {
  return (
    <div className="relative w-full flex items-center justify-center my-auto py-1 select-none overflow-visible">
      {/* Golden Ambient Glow behind the devices */}
      <div
        className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 -z-10 opacity-75 blur-2xl"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.04) 60%, transparent 80%)',
        }}
      />

      {/* 3D Staging Container with perspective */}
      <div
        className="relative flex items-end justify-center mx-auto"
        style={{ perspective: 1000 }}
      >
        {/* Floor Contact Shadows */}
        <div className="absolute -bottom-3 inset-x-2 h-7 bg-black/90 blur-xl rounded-full pointer-events-none -z-10" />

        {/* iPad Pro (Noticeably Larger, Standing 3D Tilted to the Left) */}
        <motion.div
          animate={{
            y: [0, -5, 0],
            rotateY: [-13, -11, -13],
          }}
          transition={{
            duration: 5.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'perspective(1000px) rotateY(-12deg) rotateX(3deg)',
            willChange: 'transform',
          }}
          className="relative z-10 shrink-0 -mr-5 xs:-mr-7 shadow-[0_16px_36px_rgba(0,0,0,0.85)] rounded-[28px]"
        >
          <IpadFrontMockup className="w-[185px] xs:w-[210px] sm:w-[240px]" />
        </motion.div>

        {/* iPhone 16 Pro (Compact & Handheld, Standing 3D in Front-Right) */}
        <motion.div
          animate={{
            y: [0, -7, 0],
            rotateY: [-7, -5, -7],
          }}
          transition={{
            duration: 4.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.25,
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: 'perspective(1000px) rotateY(-6deg) rotateX(2deg) translateZ(35px) translateY(14px)',
            willChange: 'transform',
          }}
          className="relative z-20 shrink-0 shadow-[0_20px_45px_rgba(0,0,0,0.95)] rounded-[24px]"
        >
          <IphoneFrontMockup className="w-[76px] xs:w-[84px] sm:w-[96px]" />
        </motion.div>
      </div>
    </div>
  );
}

