'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ui/ColorBends'), {
  ssr: false,
});

export function GlobalBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden bg-slate-50 dark:bg-[#090C10] transition-colors duration-300"
    >
      <div className="opacity-0 dark:opacity-100 transition-opacity duration-300 w-full h-full">
        {/* ── On Mobile (< md): Pure CSS Hardware-Accelerated Ambient Glow (Zero CPU/GPU cost, 120 FPS native touch scrolling) ── */}
        <div className="block md:hidden absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(248,198,30,0.14),transparent_65%),radial-gradient(circle_at_80%_75%,rgba(184,144,18,0.08),transparent_55%)] pointer-events-none" />

        {/* ── On Tablet & Desktop (>= md): Full WebGL ColorBends Engine ── */}
        <div className="hidden md:block w-full h-full">
          <ColorBends
            rotation={90}
            speed={0.2}
            colors={["#f8c61e", "#b89012"]}
            transparent={true}
            autoRotate={0}
            scale={1}
            frequency={1}
            warpStrength={1}
            mouseInfluence={1}
            parallax={0.5}
            noise={0.15}
            iterations={1}
            intensity={1.5}
            bandWidth={6}
          />
        </div>

        {/* ── Layer 1: Deep Obsidian Contrast Layer (From Bexdre) ── */}
        <div className="absolute inset-0 bg-[#090C10]/65 pointer-events-none" />

        {/* ── Layer 2: Directional Top/Bottom Atmospheric Scrim (From Bexdre) ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090C10]/85 via-[#090C10]/40 to-[#090C10]/95 pointer-events-none" />

        {/* ── Layer 3: Deep Radial Perimeter Vignette (From Bexdre) ── */}
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_25%,#090c10f2_100%)] pointer-events-none" />
      </div>
    </div>
  );
}
