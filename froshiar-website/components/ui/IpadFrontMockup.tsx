'use client';

import React from 'react';
import Image from 'next/image';

interface IpadFrontMockupProps {
  className?: string;
  glowScale?: number;
}

export function IpadFrontMockup({ className = '', glowScale = 1 }: IpadFrontMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Photorealistic iPad Pro Hardware Frame (Space Black / Dark Titanium) */}
      <div className="relative w-full aspect-[3/4.1] rounded-[24px] sm:rounded-[32px] p-[5px] sm:p-[7px] bg-gradient-to-b from-[#383C48] via-[#1E2028] to-[#121318] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.3)] ring-1 ring-white/15 overflow-hidden">
        {/* Outer Titanium Chamfer Light Reflection */}
        <div className="absolute inset-0 rounded-[24px] sm:rounded-[32px] border border-white/20 pointer-events-none" />

        {/* Top Edge Power Button */}
        <div className="absolute top-0 right-10 w-8 h-[2px] bg-[#4B5060] rounded-t-sm" />

        {/* Right Edge Volume Buttons */}
        <div className="absolute top-12 -right-[2px] w-[2px] h-8 bg-[#4B5060] rounded-r-sm" />
        <div className="absolute top-22 -right-[2px] w-[2px] h-8 bg-[#4B5060] rounded-r-sm" />

        {/* OLED Screen Area */}
        <div className="relative w-full h-full rounded-[19px] sm:rounded-[25px] bg-[#07080C] overflow-hidden flex flex-col items-center justify-center p-4">
          {/* TrueDepth Front Camera Sensor (Top Bezel Center) */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-20">
            <div className="w-2 h-2 rounded-full bg-[#030408] ring-1 ring-white/10 flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-emerald-400/60" />
            </div>
          </div>

          {/* Golden Ambient Radial Aura */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.05) 50%, transparent 75%)',
            }}
          />

          {/* Concentric Subtle Tech Rings */}
          <div
            className="pointer-events-none absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-gold-400/[0.08] animate-pulse"
            style={{ animationDuration: '4s' }}
          />
          <div className="pointer-events-none absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-gold-400/[0.05] border-dashed" />

          {/* Froshiar Transparent PNG Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gold-500/25 blur-2xl rounded-full scale-125 pointer-events-none" />
            <Image
              src="/logo.png"
              alt="Froshiar Logo"
              width={160}
              height={160}
              priority
              className="relative z-10 w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 object-contain drop-shadow-[0_10px_28px_rgba(212,175,55,0.45)]"
            />
          </div>

          {/* Diagonal Glass Specular Sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08]"
          />
        </div>
      </div>
    </div>
  );
}

