'use client';

import React from 'react';
import Image from 'next/image';

interface IphoneFrontMockupProps {
  className?: string;
}

export function IphoneFrontMockup({ className = '' }: IphoneFrontMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Photorealistic iPhone 16 Pro Hardware Frame (Grade 5 Titanium Contoured Rail) */}
      <div className="relative w-full aspect-[9/19.5] rounded-[24px] sm:rounded-[36px] p-[3.5px] sm:p-[5px] bg-gradient-to-b from-[#3E4250] via-[#20222A] to-[#121319] shadow-[0_20px_50px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.35)] ring-1 ring-white/15 overflow-hidden">
        {/* Outer Titanium Chamfer Highlight */}
        <div className="absolute inset-0 rounded-[24px] sm:rounded-[36px] border border-white/20 pointer-events-none" />

        {/* Left Edge Action Button & Volume Buttons */}
        <div className="absolute top-12 -left-[1.5px] w-[1.5px] h-3 bg-[#4B5060] rounded-l-sm" />
        <div className="absolute top-18 -left-[1.5px] w-[1.5px] h-5.5 bg-[#4B5060] rounded-l-sm" />
        <div className="absolute top-26 -left-[1.5px] w-[1.5px] h-5.5 bg-[#4B5060] rounded-l-sm" />

        {/* Right Edge Power Button & Camera Control */}
        <div className="absolute top-20 -right-[1.5px] w-[1.5px] h-8 bg-[#4B5060] rounded-r-sm" />
        <div className="absolute top-34 -right-[1.5px] w-[1.5px] h-6 bg-[#3E4250] rounded-r-sm" />

        {/* OLED Screen Area */}
        <div className="relative w-full h-full rounded-[21px] sm:rounded-[31px] bg-[#07080C] overflow-hidden flex flex-col items-center justify-center p-2">
          {/* Dynamic Island Pill (Proportional & Realistic) */}
          <div className="absolute top-1.5 sm:top-2.5 left-1/2 -translate-x-1/2 z-20 w-[34%] h-3 sm:h-4 bg-black rounded-full flex items-center justify-between px-1.5 shadow-sm ring-1 ring-white/5 pointer-events-none">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#05060A] ring-1 ring-white/10 flex items-center justify-center">
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-emerald-400/60" />
            </div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#0E1018]" />
          </div>

          {/* Golden Ambient Radial Aura */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.05) 50%, transparent 75%)',
            }}
          />

          {/* Concentric Subtle Tech Rings */}
          <div
            className="pointer-events-none absolute w-24 h-24 sm:w-36 sm:h-36 rounded-full border border-gold-400/[0.08] animate-pulse"
            style={{ animationDuration: '4s' }}
          />

          {/* Froshiar Transparent PNG Logo */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gold-500/25 blur-xl rounded-full scale-125 pointer-events-none" />
            <Image
              src="/logo.png"
              alt="Froshiar Logo"
              width={100}
              height={100}
              priority
              className="relative z-10 w-9 h-9 xs:w-11 xs:h-11 sm:w-14 sm:h-14 lg:w-18 lg:h-18 object-contain drop-shadow-[0_6px_18px_rgba(212,175,55,0.45)]"
            />
          </div>

          {/* Diagonal Glass Specular Sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.09]"
          />
        </div>
      </div>
    </div>
  );
}
