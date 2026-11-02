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
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden bg-[#090C10]"
    >
      {/* 
        Exact Bexdre WebGL ColorBends Engine
        Colors tuned to Froshiar gold (#f8c61e)
      */}
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

      {/* ── Layer 1: Deep Obsidian Contrast Layer (From Bexdre) ── */}
      <div className="absolute inset-0 bg-[#090C10]/65 pointer-events-none" />

      {/* ── Layer 2: Directional Top/Bottom Atmospheric Scrim (From Bexdre) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090C10]/85 via-[#090C10]/40 to-[#090C10]/95 pointer-events-none" />

      {/* ── Layer 3: Deep Radial Perimeter Vignette (From Bexdre) ── */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_25%,#090c10f2_100%)] pointer-events-none" />
    </div>
  );
}
